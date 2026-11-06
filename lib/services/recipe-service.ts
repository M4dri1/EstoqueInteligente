import { recipeSchema } from "@/lib/validation";
import { fail, type ServiceResult } from "@/lib/api";
import { recipeRepository } from "@/lib/repositories/recipe-repository";
import { productRepository } from "@/lib/repositories/product-repository";
import { marginOf, recipeCostCents } from "@/lib/stock";

type RecipeWithItems = NonNullable<Awaited<ReturnType<typeof recipeRepository.findById>>>;

function present(recipe: RecipeWithItems) {
  const costCents = recipeCostCents(recipe.items);
  const portions = recipe.items.map((item) =>
    item.quantity > 0 ? Math.floor(Math.max(item.product.currentStock, 0) / item.quantity) : 0
  );
  return {
    ...recipe,
    costCents,
    ...marginOf(recipe.priceCents, costCents),
    available: portions.length ? Math.min(...portions) : 0,
  };
}

export const recipeService = {
  async list(includeInactive = false) {
    const recipes = await recipeRepository.list(includeInactive);
    return recipes.map(present);
  },

  async save(body: unknown, id?: string): Promise<ServiceResult<{ id: string }>> {
    const parsed = recipeSchema.safeParse(body);
    if (!parsed.success) {
      return fail(400, parsed.error.issues[0]?.message || "Confira os dados do item.");
    }
    if (id && !(await recipeRepository.findById(id))) {
      return fail(404, "Item do cardápio não encontrado.");
    }
    const same = await recipeRepository.findByName(parsed.data.name);
    if (same && same.id !== id) {
      return fail(409, "Já existe um item no cardápio com esse nome.");
    }
    const ids = parsed.data.items.map((item) => item.productId);
    const products = await productRepository.findManyByIds(ids);
    if (products.length !== ids.length || products.some((product) => !product.active)) {
      return fail(400, "Algum produto do item não existe ou está inativo.");
    }
    const recipe = id
      ? await recipeRepository.update(id, parsed.data)
      : await recipeRepository.create(parsed.data);
    return { ok: true, data: { id: recipe.id }, status: id ? 200 : 201 };
  },
};
