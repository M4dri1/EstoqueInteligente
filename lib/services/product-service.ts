import { productSchema } from "@/lib/validation";
import { fail, type ServiceResult } from "@/lib/api";
import {
  productRepository,
  type ProductFilters,
} from "@/lib/repositories/product-repository";
import { supplierRepository } from "@/lib/repositories/supplier-repository";
import { stockStatus, suggestedPackages, valueCents } from "@/lib/stock";

async function checkRefs(data: { name: string; barcode: string | null; supplierId: string | null }, id?: string) {
  const sameName = await productRepository.findByName(data.name);
  if (sameName && sameName.id !== id) {
    return "Já existe um produto com esse nome.";
  }
  if (data.barcode) {
    const sameCode = await productRepository.findByBarcode(data.barcode);
    if (sameCode && sameCode.id !== id) {
      return `Esse código de barras já é do produto ${sameCode.name}.`;
    }
  }
  if (data.supplierId && !(await supplierRepository.findById(data.supplierId))) {
    return "Fornecedor não encontrado.";
  }
  return null;
}

export const productService = {
  async list(filters: ProductFilters) {
    const products = await productRepository.list(filters);
    return products.map((product) => ({
      ...product,
      status: stockStatus(product),
      stockValueCents: valueCents(Math.max(product.currentStock, 0), product),
      suggestedPackages: suggestedPackages(product),
    }));
  },

  async create(body: unknown): Promise<ServiceResult<{ id: string }>> {
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return fail(400, "Confira os dados do produto.");
    }
    const conflict = await checkRefs(parsed.data);
    if (conflict) {
      return fail(409, conflict);
    }
    const product = await productRepository.create(parsed.data);
    return { ok: true, data: { id: product.id }, status: 201 };
  },

  async update(id: string, body: unknown): Promise<ServiceResult<{ id: string }>> {
    const existing = await productRepository.findById(id);
    if (!existing) {
      return fail(404, "Produto não encontrado.");
    }
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return fail(400, "Confira os dados do produto.");
    }
    if (parsed.data.unit !== existing.unit && existing.currentStock !== 0) {
      return fail(409, "Zere o estoque antes de trocar a unidade de medida.");
    }
    const conflict = await checkRefs(parsed.data, id);
    if (conflict) {
      return fail(409, conflict);
    }
    await productRepository.update(id, parsed.data);
    return { ok: true, data: { id } };
  },
};
