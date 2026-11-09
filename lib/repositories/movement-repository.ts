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

export class InsufficientEmptiesError extends Error {
  constructor(public readonly productName: string) {
    super(`Não há tantas garrafas vazias de ${productName} para devolver.`);
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
    emptiesOut?: number;
  }) {
    return prisma.$transaction(async (tx) => {
      if (data.emptiesOut) {
        const returned = await tx.product.updateMany({
          where: { id: data.productId, emptyStock: { gte: data.emptiesOut } },
          data: { emptyStock: { decrement: data.emptiesOut } },
        });
        if (returned.count === 0) {
          throw new InsufficientEmptiesError(data.productName);
        }
      }
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
          emptiesOut: data.emptiesOut || null,
        },
      });
    });
  },

  async setEmpties(productId: string, emptyStock: number, userId: string, productName: string) {
    return prisma.$transaction(async (tx) => {
      const before = await tx.product.findUniqueOrThrow({
        where: { id: productId },
        select: { emptyStock: true },
      });
      await tx.product.update({ where: { id: productId }, data: { emptyStock } });
      return tx.stockMovement.create({
        data: {
          productId,
          type: "AJUSTE",
          quantity: 0,
          costCents: 0,
          note: `Garrafas vazias de ${productName}: ${before.emptyStock} para ${emptyStock}`,
          userId,
        },
      });
    });
  },

  sumByProduct(type: MovementType, since: Date) {
    return prisma.stockMovement.groupBy({
      by: ["productId"],
      where: { type, createdAt: { gte: since } },
      _sum: { quantity: true, costCents: true },
    });
  },

  soldBetween(start: Date, end: Date) {
    return prisma.stockMovement.groupBy({
      by: ["productId"],
      where: { type: "VENDA", createdAt: { gte: start, lte: end } },
      _sum: { quantity: true },
    });
  },

  lossesSince(since: Date) {
    return prisma.stockMovement.findMany({
      where: {
        createdAt: { gte: since },
        OR: [{ type: "PERDA" }, { type: "AJUSTE", quantity: { lt: 0 } }],
      },
      include: {
        product: {
          select: { id: true, name: true, unit: true, packageLabel: true, packageSize: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },
};
