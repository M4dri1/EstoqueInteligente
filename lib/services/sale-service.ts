import { saleSchema } from "@/lib/validation";
import { fail, type ServiceResult } from "@/lib/api";
import type { SessionPayload } from "@/lib/auth";
import { recipeRepository } from "@/lib/repositories/recipe-repository";
import { saleRepository } from "@/lib/repositories/sale-repository";
import { InsufficientStockError } from "@/lib/repositories/movement-repository";
import { findShortages, valueCents } from "@/lib/stock";
import { formatBase } from "@/lib/format";

const STAFF_CANCEL_MINUTES = 15;

export const saleService = {
  recent() {
    return saleRepository.recent(20);
  },

  async cancel(id: string, user: SessionPayload): Promise<ServiceResult<{ id: string }>> {
    const sale = await saleRepository.findById(id);
    if (!sale) {
      return fail(404, "Venda não encontrada.");
    }
    if (sale.canceledAt) {
      return fail(409, "Essa venda já foi cancelada.");
    }
    if (user.role !== "ADMIN") {
      const ageMinutes = (Date.now() - sale.createdAt.getTime()) / 60_000;
      if (sale.userId !== user.userId || ageMinutes > STAFF_CANCEL_MINUTES) {
        return fail(
          403,
          `Você só cancela vendas suas dos últimos ${STAFF_CANCEL_MINUTES} minutos. Peça ao administrador.`
        );
      }
    }
    if (!(await saleRepository.cancel(id, user.userId))) {
      return fail(409, "Essa venda já foi cancelada.");
    }
    return { ok: true, data: { id } };
  },

  async register(
    body: unknown,
    user: SessionPayload
  ): Promise<ServiceResult<{ id: string; totalCents: number }>> {
    const parsed = saleSchema.safeParse(body);
    if (!parsed.success) {
      return fail(400, "Escolha o item e a quantidade.");
    }

    const recipe = await recipeRepository.findById(parsed.data.recipeId);
    if (!recipe || !recipe.active) {
      return fail(404, "Item do cardápio não encontrado.");
    }

    const quantity = parsed.data.quantity;
    const shortages = findShortages(recipe.items, quantity);
    if (shortages.length > 0) {
      const first = shortages[0];
      const unit = recipe.items.find((item) => item.product.id === first.productId)!.product.unit;
      return fail(
        409,
        `Estoque insuficiente de ${first.name}: precisa de ${formatBase(first.needed, unit)} e tem ${formatBase(Math.max(first.available, 0), unit)}.`
      );
    }

    const lines = recipe.items.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity * quantity,
      costCents: valueCents(item.quantity * quantity, item.product),
      empties:
        item.product.returnable && item.product.unit === "UN" ? item.quantity * quantity : 0,
    }));
    const costCents = lines.reduce((sum, line) => sum + line.costCents, 0);
    const totalCents = recipe.priceCents * quantity;

    try {
      const sale = await saleRepository.register({
        recipeId: recipe.id,
        quantity,
        priceCents: totalCents,
        costCents,
        userId: user.userId,
        lines,
      });
      return { ok: true, status: 201, data: { id: sale.id, totalCents } };
    } catch (error) {
      if (error instanceof InsufficientStockError) {
        return fail(409, error.message);
      }
      throw error;
    }
  },
};
