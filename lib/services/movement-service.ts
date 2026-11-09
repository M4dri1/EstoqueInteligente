import type { MovementType } from "@prisma/client";
import { emptiesSchema, movementSchema } from "@/lib/validation";
import { fail, type ServiceResult } from "@/lib/api";
import type { SessionPayload } from "@/lib/auth";
import {
  InsufficientEmptiesError,
  InsufficientStockError,
  movementRepository,
} from "@/lib/repositories/movement-repository";
import { productRepository } from "@/lib/repositories/product-repository";
import { averageCostCents, valueCents } from "@/lib/stock";

const MOVEMENT_TYPES: MovementType[] = ["ENTRADA", "VENDA", "PERDA", "AJUSTE"];

export const movementService = {
  list(query: { type?: string | null; productId?: string | null; days?: number }) {
    const type = MOVEMENT_TYPES.find((item) => item === query.type);
    const since = new Date(Date.now() - (query.days ?? 30) * 86_400_000);
    return movementRepository.list({
      type,
      productId: query.productId || undefined,
      since,
    });
  },

  async register(
    body: unknown,
    user: SessionPayload
  ): Promise<ServiceResult<{ id: string; currentStock: number }>> {
    const parsed = movementSchema.safeParse(body);
    if (!parsed.success) {
      return fail(400, parsed.error.issues[0]?.message || "Dados inválidos.");
    }
    const input = parsed.data;

    if (input.type !== "PERDA" && user.role !== "ADMIN") {
      return fail(403, "Só o administrador registra entradas e ajustes.");
    }

    const product = await productRepository.findById(input.productId);
    if (!product || !product.active) {
      return fail(404, "Produto não encontrado.");
    }

    const delta = input.type === "PERDA" ? -input.quantity : input.quantity;
    let movementCost = valueCents(Math.abs(delta), product);
    let newProductCostCents: number | undefined;

    if (input.type === "ENTRADA" && input.costCents !== undefined) {
      movementCost = input.costCents;
      newProductCostCents = averageCostCents(product, {
        quantity: input.quantity,
        paidCents: input.costCents,
      });
    }

    if (input.emptiesOut && !product.returnable) {
      return fail(400, "Esse produto não é de garrafa retornável.");
    }

    try {
      const movement = await movementRepository.register({
        productId: product.id,
        productName: product.name,
        type: input.type,
        quantity: delta,
        costCents: movementCost,
        note: input.note,
        userId: user.userId,
        newProductCostCents,
        emptiesOut: input.emptiesOut,
      });
      return {
        ok: true,
        status: 201,
        data: { id: movement.id, currentStock: product.currentStock + delta },
      };
    } catch (error) {
      if (error instanceof InsufficientStockError || error instanceof InsufficientEmptiesError) {
        return fail(409, error.message);
      }
      throw error;
    }
  },

  async setEmpties(
    productId: string,
    body: unknown,
    user: SessionPayload
  ): Promise<ServiceResult<{ emptyStock: number }>> {
    const parsed = emptiesSchema.safeParse(body);
    if (!parsed.success) {
      return fail(400, "Informe quantas garrafas vazias tem.");
    }
    const product = await productRepository.findById(productId);
    if (!product || !product.returnable) {
      return fail(404, "Produto de garrafa retornável não encontrado.");
    }
    await movementRepository.setEmpties(product.id, parsed.data.emptyStock, user.userId, product.name);
    return { ok: true, status: 200, data: { emptyStock: parsed.data.emptyStock } };
  },
};
