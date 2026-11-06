import { prisma } from "@/lib/prisma";
import { InsufficientStockError } from "./movement-repository";

export type SaleLine = {
  productId: string;
  productName: string;
  quantity: number;
  costCents: number;
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
          data: { currentStock: { decrement: line.quantity } },
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
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },
};
