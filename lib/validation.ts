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

export const RECIPE_CATEGORIES = [
  "Cervejas",
  "Doses",
  "Caipirinhas",
  "Porções",
  "Espetinhos",
  "Refri e água",
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

export const emptiesSchema = z.object({
  emptyStock: z.number().int().min(0).max(100_000),
});

export const inventoryStartSchema = z.object({
  categories: z.array(z.enum(CATEGORIES)).max(CATEGORIES.length).optional(),
});

export const supplierSchema = z.object({
  name: text(80),
  phone: optionalText(30),
  notes: optionalText(300),
});

export const movementSchema = z
  .object({
    productId: text(40),
    type: z.enum(["ENTRADA", "PERDA", "AJUSTE"]),
    quantity: z.number().int().min(-10_000_000).max(10_000_000),
    costCents: z.number().int().min(0).max(10_000_000).optional(),
    emptiesOut: z.number().int().min(0).max(100_000).optional(),
    note: optionalText(200),
  })
  .refine((data) => data.type === "ENTRADA" || !data.emptiesOut, {
    message: "Garrafas vazias só são devolvidas na entrada.",
    path: ["emptiesOut"],
  })
  .refine((data) => data.quantity !== 0, {
    message: "Informe uma quantidade diferente de zero.",
    path: ["quantity"],
  })
  .refine((data) => data.type === "AJUSTE" || data.quantity > 0, {
    message: "Entrada e perda usam quantidade positiva.",
    path: ["quantity"],
  })
  .refine((data) => data.type !== "PERDA" || Boolean(data.note), {
    message: "Informe o motivo da perda.",
    path: ["note"],
  });

export const recipeSchema = z.object({
  name: text(80),
  category: z.enum(RECIPE_CATEGORIES),
  priceCents: z.number().int().min(0).max(10_000_000),
  active: z.boolean().optional(),
  items: z
    .array(
      z.object({
        productId: text(40),
        quantity: z.number().int().min(1).max(100_000),
      })
    )
    .min(1)
    .max(20)
    .refine(
      (items) => new Set(items.map((item) => item.productId)).size === items.length,
      { message: "Um insumo aparece mais de uma vez." }
    ),
});

export const saleSchema = z.object({
  recipeId: text(40),
  quantity: z.number().int().min(1).max(200),
});

export const inventoryCountSchema = z.object({
  items: z
    .array(
      z.object({
        productId: text(40),
        counted: z.number().int().min(0).max(10_000_000).nullable(),
      })
    )
    .max(1000),
});

export const userSchema = z.object({
  name: text(80),
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(8).max(200),
  role: z.enum(["ADMIN", "STAFF"]),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8).max(200),
});

export const changePasswordSchema = z.object({
  current: z.string().min(1).max(200),
  password: z.string().min(8).max(200),
});

export const periodSchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export type ProductInput = z.infer<typeof productSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
export type MovementInput = z.infer<typeof movementSchema>;
export type RecipeInput = z.infer<typeof recipeSchema>;
export type SaleInput = z.infer<typeof saleSchema>;
export type UserInput = z.infer<typeof userSchema>;
