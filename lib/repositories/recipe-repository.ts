import { prisma } from "@/lib/prisma";
import type { RecipeInput } from "@/lib/validation";

const withItems = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          unit: true,
          packageLabel: true,
          packageSize: true,
          costCents: true,
          currentStock: true,
          active: true,
        },
      },
    },
  },
} as const;

export const recipeRepository = {
  list(includeInactive = false) {
    return prisma.recipe.findMany({
      where: includeInactive ? {} : { active: true },
      include: withItems,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  },

  findById(id: string) {
    return prisma.recipe.findUnique({ where: { id }, include: withItems });
  },

  findByName(name: string) {
    return prisma.recipe.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
  },

  create(data: RecipeInput) {
    return prisma.recipe.create({
      data: {
        name: data.name,
        category: data.category,
        priceCents: data.priceCents,
        active: data.active ?? true,
        items: { create: data.items },
      },
      include: withItems,
    });
  },

  update(id: string, data: RecipeInput) {
    return prisma.$transaction(async (tx) => {
      await tx.recipeItem.deleteMany({ where: { recipeId: id } });
      return tx.recipe.update({
        where: { id },
        data: {
          name: data.name,
          category: data.category,
          priceCents: data.priceCents,
          active: data.active ?? true,
          items: { create: data.items },
        },
        include: withItems,
      });
    });
  },
};
