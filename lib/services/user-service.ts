import bcrypt from "bcryptjs";
import { changePasswordSchema, resetPasswordSchema, userSchema } from "@/lib/validation";
import { fail, type ServiceResult } from "@/lib/api";
import { hashPassword, type SessionPayload } from "@/lib/auth";
import { userRepository } from "@/lib/repositories/user-repository";

export const userService = {
  list() {
    return userRepository.list();
  },

  async create(body: unknown): Promise<ServiceResult<{ id: string }>> {
    const parsed = userSchema.safeParse(body);
    if (!parsed.success) {
      return fail(400, "Preencha nome, e-mail e uma senha com pelo menos 8 caracteres.");
    }
    if (await userRepository.findByEmail(parsed.data.email)) {
      return fail(409, "Já existe um usuário com esse e-mail.");
    }
    const user = await userRepository.create({
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      passwordHash: await hashPassword(parsed.data.password),
    });
    return { ok: true, status: 201, data: { id: user.id } };
  },

  async setActive(
    id: string,
    active: boolean,
    current: SessionPayload
  ): Promise<ServiceResult<{ id: string }>> {
    const user = await userRepository.findById(id);
    if (!user) {
      return fail(404, "Usuário não encontrado.");
    }
    if (!active && user.id === current.userId) {
      return fail(409, "Você não pode desativar o próprio acesso.");
    }
    if (!active && user.role === "ADMIN" && (await userRepository.countActiveAdmins()) <= 1) {
      return fail(409, "O sistema precisa de pelo menos um administrador ativo.");
    }
    await userRepository.setActive(id, active);
    return { ok: true, data: { id } };
  },

  async resetPassword(id: string, body: unknown): Promise<ServiceResult<{ id: string }>> {
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return fail(400, "A nova senha precisa ter pelo menos 8 caracteres.");
    }
    if (!(await userRepository.findById(id))) {
      return fail(404, "Usuário não encontrado.");
    }
    await userRepository.setPassword(id, await hashPassword(parsed.data.password));
    return { ok: true, data: { id } };
  },

  async changeOwnPassword(body: unknown, current: SessionPayload): Promise<ServiceResult<{ id: string }>> {
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return fail(400, "A nova senha precisa ter pelo menos 8 caracteres.");
    }
    const user = await userRepository.findById(current.userId);
    if (!user || !(await bcrypt.compare(parsed.data.current, user.passwordHash))) {
      return fail(400, "A senha atual está errada.");
    }
    await userRepository.setPassword(user.id, await hashPassword(parsed.data.password));
    return { ok: true, data: { id: user.id } };
  },
};
