import { prisma } from "@/lib/prisma";
import type { SupplierInput } from "@/lib/validation";

export const supplierRepository = {
  list() {
    return prisma.supplier.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    });
  },

  findByName(name: string) {
    return prisma.supplier.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
  },

  findById(id: string) {
    return prisma.supplier.findUnique({ where: { id } });
  },

  create(data: SupplierInput) {
    return prisma.supplier.create({ data });
  },

  update(id: string, data: SupplierInput) {
    return prisma.supplier.update({ where: { id }, data });
  },
};
