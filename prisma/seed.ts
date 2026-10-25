import "dotenv/config";
import { PrismaClient, type Unit } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const isProduction = process.env.NODE_ENV === "production";

type ProductSeed = {
  name: string;
  category: string;
  unit: Unit;
  packageLabel: string;
  packageSize: number;
  costCents: number;
  minStock: number;
  supplier: string;
  initialPackages: number;
  targetPackages?: number;
  depositCents?: number;
};

const suppliers = [
  { name: "Distribuidora de bebidas", phone: "(14) 3433-0000" },
  { name: "Atacadão", phone: "(14) 3402-0000" },
  { name: "Açougue do bairro", phone: "(14) 99812-0000" },
  { name: "Gelo e carvão", phone: "(14) 99700-0000" },
];

const products: ProductSeed[] = [
  { name: "Cerveja Brahma 600 ml", category: "Cervejas", unit: "UN", packageLabel: "engradado", packageSize: 24, costCents: 15600, minStock: 48, supplier: "Distribuidora de bebidas", initialPackages: 8, targetPackages: 10, depositCents: 150 },
  { name: "Cerveja Original 600 ml", category: "Cervejas", unit: "UN", packageLabel: "engradado", packageSize: 24, costCents: 19200, minStock: 48, supplier: "Distribuidora de bebidas", initialPackages: 6, targetPackages: 8, depositCents: 150 },
  { name: "Cerveja Skol litrão 1 L", category: "Cervejas", unit: "UN", packageLabel: "engradado", packageSize: 12, costCents: 10800, minStock: 24, supplier: "Distribuidora de bebidas", initialPackages: 10, depositCents: 200 },
  { name: "Cerveja Heineken long neck", category: "Cervejas", unit: "UN", packageLabel: "caixa", packageSize: 24, costCents: 13200, minStock: 24, supplier: "Distribuidora de bebidas", initialPackages: 3 },
  { name: "Cachaça 51", category: "Pinga e destilados", unit: "ML", packageLabel: "garrafa", packageSize: 965, costCents: 1690, minStock: 1930, supplier: "Atacadão", initialPackages: 10 },
  { name: "Cachaça Velho Barreiro", category: "Pinga e destilados", unit: "ML", packageLabel: "garrafa", packageSize: 910, costCents: 1590, minStock: 910, supplier: "Atacadão", initialPackages: 6 },
  { name: "Conhaque Dreher", category: "Pinga e destilados", unit: "ML", packageLabel: "garrafa", packageSize: 900, costCents: 1990, minStock: 900, supplier: "Atacadão", initialPackages: 4 },
  { name: "Vermute Cinzano", category: "Pinga e destilados", unit: "ML", packageLabel: "garrafa", packageSize: 1000, costCents: 3290, minStock: 500, supplier: "Atacadão", initialPackages: 2 },
  { name: "Vodka Smirnoff", category: "Pinga e destilados", unit: "ML", packageLabel: "garrafa", packageSize: 998, costCents: 3790, minStock: 998, supplier: "Atacadão", initialPackages: 4 },
  { name: "Coca-Cola lata", category: "Refrigerantes e águas", unit: "UN", packageLabel: "fardo", packageSize: 12, costCents: 3840, minStock: 24, supplier: "Distribuidora de bebidas", initialPackages: 8 },
  { name: "Guaraná Antarctica lata", category: "Refrigerantes e águas", unit: "UN", packageLabel: "fardo", packageSize: 12, costCents: 3360, minStock: 24, supplier: "Distribuidora de bebidas", initialPackages: 6 },
  { name: "Água mineral 500 ml", category: "Refrigerantes e águas", unit: "UN", packageLabel: "fardo", packageSize: 12, costCents: 1440, minStock: 12, supplier: "Distribuidora de bebidas", initialPackages: 4 },
  { name: "Limão tahiti", category: "Caipirinha", unit: "UN", packageLabel: "un", packageSize: 1, costCents: 40, minStock: 60, supplier: "Atacadão", initialPackages: 300 },
  { name: "Açúcar refinado", category: "Caipirinha", unit: "G", packageLabel: "pacote", packageSize: 1000, costCents: 549, minStock: 1000, supplier: "Atacadão", initialPackages: 5 },
  { name: "Calabresa", category: "Cozinha", unit: "G", packageLabel: "pacote", packageSize: 2500, costCents: 4990, minStock: 2500, supplier: "Açougue do bairro", initialPackages: 4 },
  { name: "Frango a passarinho", category: "Cozinha", unit: "G", packageLabel: "pacote", packageSize: 1000, costCents: 1890, minStock: 2000, supplier: "Açougue do bairro", initialPackages: 6 },
  { name: "Mandioca congelada", category: "Cozinha", unit: "G", packageLabel: "pacote", packageSize: 2000, costCents: 1990, minStock: 2000, supplier: "Atacadão", initialPackages: 8 },
  { name: "Batata frita congelada", category: "Cozinha", unit: "G", packageLabel: "pacote", packageSize: 2000, costCents: 2490, minStock: 4000, supplier: "Atacadão", initialPackages: 6 },
  { name: "Óleo de soja", category: "Cozinha", unit: "ML", packageLabel: "garrafa", packageSize: 900, costCents: 790, minStock: 2700, supplier: "Atacadão", initialPackages: 12 },
  { name: "Espetinho de carne", category: "Cozinha", unit: "UN", packageLabel: "pacote", packageSize: 10, costCents: 3500, minStock: 20, supplier: "Açougue do bairro", initialPackages: 8 },
  { name: "Espetinho de frango", category: "Cozinha", unit: "UN", packageLabel: "pacote", packageSize: 10, costCents: 2800, minStock: 20, supplier: "Açougue do bairro", initialPackages: 6 },
  { name: "Gelo", category: "Gelo e descartáveis", unit: "G", packageLabel: "saco", packageSize: 5000, costCents: 1200, minStock: 10000, supplier: "Gelo e carvão", initialPackages: 20 },
  { name: "Carvão", category: "Gelo e descartáveis", unit: "G", packageLabel: "saco", packageSize: 3000, costCents: 1990, minStock: 3000, supplier: "Gelo e carvão", initialPackages: 4 },
];

async function seedUsers() {
  if (isProduction && (process.env.ADMIN_PASSWORD || "").length < 12) {
    throw new Error("Em produção, ADMIN_PASSWORD precisa ter pelo menos 12 caracteres.");
  }
  const email = (process.env.ADMIN_EMAIL || "admin@kassius.local").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "kassiusadmin123";
  const name = process.env.ADMIN_NAME || "Administrador Kassius";
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name, role: "ADMIN", active: true },
    create: { email, passwordHash, name, role: "ADMIN" },
  });

  if (!isProduction) {
    await prisma.user.upsert({
      where: { email: "funcionario@kassius.local" },
      update: {},
      create: {
        email: "funcionario@kassius.local",
        name: "Funcionário do bar",
        role: "STAFF",
        passwordHash: await bcrypt.hash("kassiusbar123", 10),
      },
    });
  }

  console.log(`Admin seed: ${email}`);
}

async function seedCatalog() {
  if ((await prisma.product.count()) > 0) {
    return;
  }

  const supplierIds = new Map<string, string>();
  for (const supplier of suppliers) {
    const created = await prisma.supplier.create({ data: supplier });
    supplierIds.set(supplier.name, created.id);
  }

  for (const item of products) {
    await prisma.product.create({
      data: {
        name: item.name,
        category: item.category,
        unit: item.unit,
        packageLabel: item.packageLabel,
        packageSize: item.packageSize,
        costCents: item.costCents,
        minStock: item.minStock,
        targetStock: item.targetPackages ? item.targetPackages * item.packageSize : null,
        returnable: Boolean(item.depositCents),
        depositCents: item.depositCents ?? 0,
        currentStock: isProduction ? 0 : item.initialPackages * item.packageSize,
        supplierId: supplierIds.get(item.supplier),
      },
    });
  }

  console.log(`Produtos de exemplo: ${products.length} produtos de ${suppliers.length} fornecedores.`);
}

async function main() {
  await seedUsers();
  await seedCatalog();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
