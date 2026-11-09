import { prisma } from "@/lib/prisma";
import { InsufficientStockError } from "./movement-repository";

export type SaleLine = {
  productId: string;
  productName: string;
  quantity: number;
  costCents: number;
  empties: number;
};

export const saleRepository = {
  async register(data: {
    recipeId: string;
    quantity: number;
    priceCents: number;
    costCents: number;
    userId: string;
    lines: SaleLine[];
  }) {
    return prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          recipeId: data.recipeId,
          quantity: data.quantity,
          priceCents: data.priceCents,
          costCents: data.costCents,
          userId: data.userId,
        },
      });

      for (const line of data.lines) {
        const updated = await tx.product.updateMany({
          where: { id: line.productId, currentStock: { gte: line.quantity } },
          data: {
            currentStock: { decrement: line.quantity },
            ...(line.empties ? { emptyStock: { increment: line.empties } } : {}),
          },
        });
        if (updated.count === 0) {
          throw new InsufficientStockError(line.productName);
        }
        await tx.stockMovement.create({
          data: {
            productId: line.productId,
            type: "VENDA",
            quantity: -line.quantity,
            costCents: line.costCents,
            userId: data.userId,
            saleId: sale.id,
          },
        });
      }

      return sale;
    });
  },

  recent(limit = 20) {
    return prisma.sale.findMany({
      include: {
        recipe: { select: { name: true } },
        user: { select: { name: true } },
        canceledBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  findById(id: string) {
    return prisma.sale.findUnique({ where: { id } });
  },

  async cancel(saleId: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const marked = await tx.sale.updateMany({
        where: { id: saleId, canceledAt: null },
        data: { canceledAt: new Date(), canceledById: userId },
      });
      if (marked.count === 0) {
        return false;
      }
      const lines = await tx.stockMovement.findMany({
        where: { saleId, type: "VENDA", quantity: { lt: 0 } },
        include: { product: { select: { returnable: true, unit: true, emptyStock: true } } },
      });
      for (const line of lines) {
        const back = -line.quantity;
        const empties =
          line.product.returnable && line.product.unit === "UN"
            ? Math.min(back, line.product.emptyStock)
            : 0;
        await tx.product.update({
          where: { id: line.productId },
          data: {
            currentStock: { increment: back },
            ...(empties ? { emptyStock: { decrement: empties } } : {}),
          },
        });
        await tx.stockMovement.create({
          data: {
            productId: line.productId,
            type: "VENDA",
            quantity: back,
            costCents: -line.costCents,
            note: "Venda cancelada",
            userId,
            saleId,
          },
        });
      }
      return true;
    });
  },

  since(since: Date) {
    return prisma.sale.findMany({
      where: { createdAt: { gte: since }, canceledAt: null },
      include: {
        recipe: { select: { id: true, name: true, category: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  },
};
