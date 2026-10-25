import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ProductInput } from "@/lib/validation";

export type ProductFilters = {
  search?: string;
  category?: string;
  includeInactive?: boolean;
};

export const productRepository = {
  list(filters: ProductFilters = {}) {
    const where: Prisma.ProductWhereInput = {};
    if (!filters.includeInactive) {
      where.active = true;
    }
    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { barcode: filters.search },
      ];
    }
    return prisma.product.findMany({
      where,
      include: { supplier: { select: { id: true, name: true, phone: true } } },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  },

  findById(id: string) {
    return prisma.product.findUnique({ where: { id } });
  },

  findByName(name: string) {
    return prisma.product.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
  },

  findByBarcode(barcode: string) {
    return prisma.product.findUnique({ where: { barcode } });
  },

  findManyByIds(ids: string[]) {
    return prisma.product.findMany({ where: { id: { in: ids } } });
  },

  create(data: ProductInput) {
    return prisma.product.create({ data });
  },

  update(id: string, data: ProductInput) {
    return prisma.product.update({ where: { id }, data });
  },
};
