import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const itemInclude = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          category: true,
          unit: true,
          packageLabel: true,
          packageSize: true,
          costCents: true,
          currentStock: true,
        },
      },
    },
    orderBy: [{ product: { category: "asc" } }, { product: { name: "asc" } }],
  },
  user: { select: { name: true } },
} satisfies Prisma.InventoryCountInclude;

export const inventoryRepository = {
  list() {
    return prisma.inventoryCount.findMany({
      include: {
        user: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
  },

  findOpen() {
    return prisma.inventoryCount.findFirst({ where: { status: "ABERTO" } });
  },

  findById(id: string) {
    return prisma.inventoryCount.findUnique({ where: { id }, include: itemInclude });
  },

  findLatest() {
    return prisma.inventoryCount.findFirst({
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, createdAt: true, closedAt: true, categories: true },
    });
  },

  findPreviousClosed(before: Date) {
    return prisma.inventoryCount.findFirst({
      where: { status: "FECHADO", closedAt: { lt: before } },
      orderBy: { closedAt: "desc" },
      select: { closedAt: true },
    });
  },

  async open(userId: string, categories: string[]) {
    const products = await prisma.product.findMany({
      where: { active: true, ...(categories.length ? { category: { in: categories } } : {}) },
      select: { id: true, currentStock: true },
    });
    if (products.length === 0) {
      return null;
    }
    return prisma.inventoryCount.create({
      data: {
        userId,
        categories,
        items: {
          create: products.map((product) => ({
            productId: product.id,
            expected: product.currentStock,
          })),
        },
      },
    });
  },

  async saveCounts(id: string, items: Array<{ productId: string; counted: number | null }>) {
    await prisma.$transaction(
      items.map((item) =>
        prisma.inventoryItem.updateMany({
          where: { inventoryId: id, productId: item.productId },
          data: { counted: item.counted },
        })
      )
    );
  },

  async close(
    id: string,
    userId: string,
    valueOf: (quantity: number, product: { costCents: number; packageSize: number }) => number
  ) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.inventoryCount.updateMany({
        where: { id, status: "ABERTO" },
        data: { status: "FECHADO", closedAt: new Date() },
      });
      if (current.count === 0) {
        return null;
      }

      const rows = await tx.inventoryItem.findMany({
        where: { inventoryId: id, counted: { not: null } },
        include: {
          product: { select: { id: true, currentStock: true, costCents: true, packageSize: true } },
        },
      });

      let adjusted = 0;
      for (const row of rows) {
        const counted = row.counted ?? 0;
        const difference = counted - row.product.currentStock;
        await tx.inventoryItem.update({
          where: { id: row.id },
          data: { expected: row.product.currentStock },
        });
        if (difference === 0) {
          continue;
        }
        adjusted += 1;
        await tx.product.update({
          where: { id: row.productId },
          data: { currentStock: counted },
        });
        await tx.stockMovement.create({
          data: {
            productId: row.productId,
            type: "AJUSTE",
            quantity: difference,
            costCents: valueOf(Math.abs(difference), row.product),
            note: "Ajuste de inventário",
            userId,
            inventoryId: id,
          },
        });
      }
      return { counted: rows.length, adjusted };
    });
  },
};
