import { z } from "zod";

export const CATEGORIES = [
  "Cervejas",
  "Pinga e destilados",
  "Refrigerantes e águas",
  "Cozinha",
  "Caipirinha",
  "Gelo e descartáveis",
  "Outros",
] as const;

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(1).max(200),
});

export const productSchema = z.object({
  name: text(80),
  category: z.enum(CATEGORIES),
  unit: z.enum(["ML", "G", "UN"]),
  packageLabel: text(20),
  packageSize: z.number().int().min(1).max(100_000),
  costCents: z.number().int().min(0).max(10_000_000),
  minStock: z.number().int().min(0).max(10_000_000),
  targetStock: z.number().int().min(0).max(10_000_000).nullable().optional(),
  returnable: z.boolean().optional(),
  depositCents: z.number().int().min(0).max(100_000).optional(),
  barcode: optionalText(40),
  supplierId: optionalText(40),
  active: z.boolean().optional(),
})
  .refine((data) => !data.returnable || data.unit === "UN", {
    message: "Garrafa retornável só vale para produto contado em unidades.",
    path: ["returnable"],
  })
  .refine((data) => !data.targetStock || data.targetStock > data.minStock, {
    message: "O estoque ideal precisa ser maior que o mínimo.",
    path: ["targetStock"],
  });

export const supplierSchema = z.object({
  name: text(80),
  phone: optionalText(30),
  notes: optionalText(300),
});

export type ProductInput = z.infer<typeof productSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
