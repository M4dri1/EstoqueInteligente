import { inventoryCountSchema, inventoryStartSchema } from "@/lib/validation";
import { fail, type ServiceResult } from "@/lib/api";
import type { SessionPayload } from "@/lib/auth";
import { inventoryRepository } from "@/lib/repositories/inventory-repository";
import { movementRepository } from "@/lib/repositories/movement-repository";
import { inventoryDifference, valueCents, variancePct } from "@/lib/stock";

const DAY_MS = 86_400_000;

export const inventoryService = {
  list() {
    return inventoryRepository.list();
  },

  async detail(id: string) {
    const inventory = await inventoryRepository.findById(id);
    if (!inventory) {
      return null;
    }
    const end = inventory.closedAt ?? new Date();
    const previous = await inventoryRepository.findPreviousClosed(inventory.createdAt);
    const salesStart = previous?.closedAt ?? new Date(inventory.createdAt.getTime() - 7 * DAY_MS);
    const soldRows = await movementRepository.soldBetween(salesStart, end);
    const soldByProduct = new Map(
      soldRows.map((row) => [row.productId, Math.abs(row._sum.quantity ?? 0)])
    );

    const items = inventory.items.map((item) => {
      const reference = inventory.status === "ABERTO" ? item.product.currentStock : item.expected;
      const difference = inventoryDifference(reference, item.counted);
      const sold = soldByProduct.get(item.productId) ?? 0;
      return {
        ...item,
        reference,
        difference,
        differenceCents: difference === null ? null : valueCents(difference, item.product),
        sold,
        variancePct: variancePct(difference, sold),
      };
    });
    const counted = items.filter((item) => item.counted !== null);
    return {
      ...inventory,
      items,
      salesSince: salesStart,
      summary: {
        total: items.length,
        counted: counted.length,
        missingCents: counted.reduce(
          (sum, item) => sum + Math.min(item.differenceCents ?? 0, 0),
          0
        ),
        surplusCents: counted.reduce(
          (sum, item) => sum + Math.max(item.differenceCents ?? 0, 0),
          0
        ),
      },
    };
  },

  async open(body: unknown, user: SessionPayload): Promise<ServiceResult<{ id: string }>> {
    const parsed = inventoryStartSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return fail(400, "Categoria inválida para a contagem.");
    }
    const existing = await inventoryRepository.findOpen();
    if (existing) {
      return { ok: true, data: { id: existing.id } };
    }
    const inventory = await inventoryRepository.open(user.userId, parsed.data.categories ?? []);
    if (!inventory) {
      return fail(400, "Nenhum produto ativo nessas categorias.");
    }
    return { ok: true, status: 201, data: { id: inventory.id } };
  },

  async save(id: string, body: unknown): Promise<ServiceResult<{ saved: number }>> {
    const inventory = await inventoryRepository.findById(id);
    if (!inventory) {
      return fail(404, "Contagem não encontrada.");
    }
    if (inventory.status !== "ABERTO") {
      return fail(409, "Essa contagem já foi fechada.");
    }
    const parsed = inventoryCountSchema.safeParse(body);
    if (!parsed.success) {
      return fail(400, "Quantidades inválidas na contagem.");
    }
    await inventoryRepository.saveCounts(id, parsed.data.items);
    return { ok: true, data: { saved: parsed.data.items.length } };
  },

  async close(
    id: string,
    user: SessionPayload
  ): Promise<ServiceResult<{ counted: number; adjusted: number }>> {
    if (user.role !== "ADMIN") {
      return fail(403, "Só o administrador fecha a contagem e ajusta o estoque.");
    }
    const inventory = await inventoryRepository.findById(id);
    if (!inventory) {
      return fail(404, "Contagem não encontrada.");
    }
    if (!inventory.items.some((item) => item.counted !== null)) {
      return fail(400, "Conte pelo menos um produto antes de fechar.");
    }
    const result = await inventoryRepository.close(id, user.userId, valueCents);
    if (!result) {
      return fail(409, "Essa contagem já foi fechada.");
    }
    return { ok: true, data: result };
  },
};
