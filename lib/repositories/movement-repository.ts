import type { MovementType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type MovementFilters = {
  type?: MovementType;
  productId?: string;
  since?: Date;
  limit?: number;
};

export class InsufficientStockError extends Error {
  constructor(public readonly productName: string) {
    super(`Estoque insuficiente de ${productName}.`);
  }
}

export const movementRepository = {
  list(filters: MovementFilters = {}) {
    const where: Prisma.StockMovementWhereInput = {};
    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.productId) {
      where.productId = filters.productId;
    }
    if (filters.since) {
      where.createdAt = { gte: filters.since };
    }
    return prisma.stockMovement.findMany({
      where,
      include: {
        product: {
          select: { id: true, name: true, unit: true, packageLabel: true, packageSize: true },
        },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: filters.limit ?? 200,
    });
  },

  async register(data: {
    productId: string;
    productName: string;
    type: MovementType;
    quantity: number;
    costCents: number;
    note: string | null;
    userId: string;
    newProductCostCents?: number;
  }) {
    return prisma.$transaction(async (tx) => {
      if (data.quantity < 0) {
        const updated = await tx.product.updateMany({
          where: { id: data.productId, currentStock: { gte: -data.quantity } },
          data: { currentStock: { increment: data.quantity } },
        });
        if (updated.count === 0) {
          throw new InsufficientStockError(data.productName);
        }
      } else {
        await tx.product.update({
          where: { id: data.productId },
          data: {
            currentStock: { increment: data.quantity },
            ...(data.newProductCostCents !== undefined
              ? { costCents: data.newProductCostCents }
              : {}),
          },
        });
      }

      return tx.stockMovement.create({
        data: {
          productId: data.productId,
          type: data.type,
          quantity: data.quantity,
          costCents: data.costCents,
          note: data.note,
          userId: data.userId,
        },
      });
    });
  },
};
