import type { MovementType } from "@prisma/client";
import { movementSchema } from "@/lib/validation";
import { fail, type ServiceResult } from "@/lib/api";
import type { SessionPayload } from "@/lib/auth";
import {
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
      });
      return {
        ok: true,
        status: 201,
        data: { id: movement.id, currentStock: product.currentStock + delta },
      };
    } catch (error) {
      if (error instanceof InsufficientStockError) {
        return fail(409, error.message);
      }
      throw error;
    }
  },
};
