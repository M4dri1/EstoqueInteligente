import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const publicFields = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  createdAt: true,
} as const;

export const userRepository = {
  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  list() {
    return prisma.user.findMany({
      select: publicFields,
      orderBy: [{ active: "desc" }, { name: "asc" }],
    });
  },

  create(data: { email: string; name: string; passwordHash: string; role: Role }) {
    return prisma.user.create({ data, select: publicFields });
  },

  setActive(id: string, active: boolean) {
    return prisma.user.update({ where: { id }, data: { active }, select: publicFields });
  },

  setPassword(id: string, passwordHash: string) {
    return prisma.user.update({ where: { id }, data: { passwordHash }, select: publicFields });
  },

  countActiveAdmins() {
    return prisma.user.count({ where: { role: "ADMIN", active: true } });
  },
};
