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

  const admin = await prisma.user.upsert({
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
  return admin.id;
}

const recipes: Array<{
  name: string;
  category: string;
  priceCents: number;
  items: Array<[string, number]>;
  weight: number;
}> = [
  { name: "Brahma 600", category: "Cervejas", priceCents: 1200, items: [["Cerveja Brahma 600 ml", 1]], weight: 12 },
  { name: "Original 600", category: "Cervejas", priceCents: 1400, items: [["Cerveja Original 600 ml", 1]], weight: 9 },
  { name: "Litrão Skol", category: "Cervejas", priceCents: 1500, items: [["Cerveja Skol litrão 1 L", 1]], weight: 7 },
  { name: "Heineken long neck", category: "Cervejas", priceCents: 1000, items: [["Cerveja Heineken long neck", 1]], weight: 4 },
  { name: "Dose de 51", category: "Doses", priceCents: 500, items: [["Cachaça 51", 50]], weight: 6 },
  { name: "Dose de Velho Barreiro", category: "Doses", priceCents: 500, items: [["Cachaça Velho Barreiro", 50]], weight: 3 },
  { name: "Dose de conhaque", category: "Doses", priceCents: 600, items: [["Conhaque Dreher", 50]], weight: 2 },
  { name: "Rabo de galo", category: "Doses", priceCents: 800, items: [["Cachaça 51", 40], ["Vermute Cinzano", 20]], weight: 2 },
  { name: "Caipirinha de limão", category: "Caipirinhas", priceCents: 1500, items: [["Cachaça 51", 60], ["Limão tahiti", 2], ["Açúcar refinado", 30], ["Gelo", 150]], weight: 5 },
  { name: "Caipiroska", category: "Caipirinhas", priceCents: 1800, items: [["Vodka Smirnoff", 60], ["Limão tahiti", 2], ["Açúcar refinado", 30], ["Gelo", 150]], weight: 2 },
  { name: "Calabresa acebolada", category: "Porções", priceCents: 3500, items: [["Calabresa", 400], ["Óleo de soja", 30]], weight: 3 },
  { name: "Mandioca frita", category: "Porções", priceCents: 2800, items: [["Mandioca congelada", 500], ["Óleo de soja", 100]], weight: 2 },
  { name: "Batata frita", category: "Porções", priceCents: 2800, items: [["Batata frita congelada", 400], ["Óleo de soja", 100]], weight: 3 },
  { name: "Frango a passarinho", category: "Porções", priceCents: 4000, items: [["Frango a passarinho", 500], ["Óleo de soja", 150]], weight: 2 },
  { name: "Espetinho de carne", category: "Espetinhos", priceCents: 1000, items: [["Espetinho de carne", 1], ["Carvão", 100]], weight: 4 },
  { name: "Espetinho de frango", category: "Espetinhos", priceCents: 800, items: [["Espetinho de frango", 1], ["Carvão", 100]], weight: 3 },
  { name: "Coca-Cola lata", category: "Refri e água", priceCents: 600, items: [["Coca-Cola lata", 1]], weight: 4 },
  { name: "Guaraná lata", category: "Refri e água", priceCents: 600, items: [["Guaraná Antarctica lata", 1]], weight: 3 },
  { name: "Água mineral", category: "Refri e água", priceCents: 400, items: [["Água mineral 500 ml", 1]], weight: 2 },
];

function random(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

const losses: Array<[string, number, string]> = [
  ["Cerveja Brahma 600 ml", 2, "Garrafa quebrou no engradado"],
  ["Limão tahiti", 25, "Limões estragados"],
  ["Gelo", 5000, "Saco derreteu fora do freezer"],
  ["Calabresa", 500, "Passou da validade"],
];

async function seedCatalog(adminId: string) {
  if ((await prisma.product.count()) > 0) {
    return;
  }

  const supplierIds = new Map<string, string>();
  for (const supplier of suppliers) {
    const created = await prisma.supplier.create({ data: supplier });
    supplierIds.set(supplier.name, created.id);
  }

  const start = new Date(Date.now() - 7 * 86_400_000);
  const productIds = new Map<
    string,
    { id: string; costCents: number; packageSize: number; current: number }
  >();

  for (const item of products) {
    const quantity = isProduction ? 0 : item.initialPackages * item.packageSize;
    const product = await prisma.product.create({
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
        currentStock: quantity,
        supplierId: supplierIds.get(item.supplier),
      },
    });
    productIds.set(item.name, {
      id: product.id,
      costCents: item.costCents,
      packageSize: item.packageSize,
      current: quantity,
    });
    if (quantity > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: "ENTRADA",
          quantity,
          costCents: item.initialPackages * item.costCents,
          note: "Estoque inicial",
          userId: adminId,
          createdAt: start,
        },
      });
    }
  }

  const recipeRows = [];
  for (const recipe of recipes) {
    const created = await prisma.recipe.create({
      data: {
        name: recipe.name,
        category: recipe.category,
        priceCents: recipe.priceCents,
        items: {
          create: recipe.items.map(([productName, quantity]) => ({
            productId: productIds.get(productName)!.id,
            quantity,
          })),
        },
      },
    });
    recipeRows.push({ ...recipe, id: created.id });
  }

  if (!isProduction) {
    const lossAt = new Date(Date.now() - 2 * 86_400_000);
    for (const [productName, quantity, note] of losses) {
      const product = productIds.get(productName)!;
      product.current -= quantity;
      await prisma.product.update({
        where: { id: product.id },
        data: { currentStock: { decrement: quantity } },
      });
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: "PERDA",
          quantity: -quantity,
          costCents: Math.round((quantity * product.costCents) / product.packageSize),
          note,
          userId: adminId,
          createdAt: lossAt,
        },
      });
    }

    const next = random(42);
    const totalWeight = recipeRows.reduce((sum, recipe) => sum + recipe.weight, 0);
    for (let day = 6; day >= 0; day -= 1) {
      const date = new Date(Date.now() - day * 86_400_000);
      const salesToday = Math.round(25 + next() * 15);
      for (let index = 0; index < salesToday; index += 1) {
        let pick = next() * totalWeight;
        const recipe = recipeRows.find((row) => (pick -= row.weight) < 0) ?? recipeRows[0];
        const quantity = 1 + Math.floor(next() * 3);
        const lines = recipe.items.map(([productName, perUnit]) => ({
          product: productIds.get(productName)!,
          quantity: perUnit * quantity,
        }));
        if (lines.some((line) => line.product.current < line.quantity)) {
          continue;
        }
        const createdAt = new Date(date);
        createdAt.setHours(16 + Math.floor(next() * 8), Math.floor(next() * 60), 0, 0);
        if (createdAt.getTime() > Date.now()) {
          createdAt.setTime(Date.now() - (salesToday - index) * 60_000);
        }
        const lineCosts = lines.map((line) =>
          Math.round((line.quantity * line.product.costCents) / line.product.packageSize)
        );
        await prisma.sale.create({
          data: {
            recipeId: recipe.id,
            quantity,
            priceCents: recipe.priceCents * quantity,
            costCents: lineCosts.reduce((sum, value) => sum + value, 0),
            userId: adminId,
            createdAt,
            movements: {
              create: lines.map((line, position) => ({
                productId: line.product.id,
                type: "VENDA" as const,
                quantity: -line.quantity,
                costCents: lineCosts[position],
                userId: adminId,
                createdAt,
              })),
            },
          },
        });
        for (const line of lines) {
          line.product.current -= line.quantity;
        }
      }
    }

    for (const product of Array.from(productIds.values())) {
      await prisma.product.update({
        where: { id: product.id },
        data: { currentStock: product.current },
      });
    }
  }

  console.log(`Dados de exemplo: ${products.length} produtos, ${recipes.length} itens no cardápio.`);
}

async function main() {
  const adminId = await seedUsers();
  await seedCatalog(adminId);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
