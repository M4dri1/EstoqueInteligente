import { supplierSchema } from "@/lib/validation";
import { fail, type ServiceResult } from "@/lib/api";
import { supplierRepository } from "@/lib/repositories/supplier-repository";

export const supplierService = {
  list() {
    return supplierRepository.list();
  },

  async save(body: unknown, id?: string): Promise<ServiceResult<{ id: string }>> {
    const parsed = supplierSchema.safeParse(body);
    if (!parsed.success) {
      return fail(400, "Confira os dados do fornecedor.");
    }
    if (id && !(await supplierRepository.findById(id))) {
      return fail(404, "Fornecedor não encontrado.");
    }
    const same = await supplierRepository.findByName(parsed.data.name);
    if (same && same.id !== id) {
      return fail(409, "Já existe um fornecedor com esse nome.");
    }
    const supplier = id
      ? await supplierRepository.update(id, parsed.data)
      : await supplierRepository.create(parsed.data);
    return { ok: true, data: { id: supplier.id }, status: id ? 200 : 201 };
  },
};
