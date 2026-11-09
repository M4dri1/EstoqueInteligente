import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002";
const EMAIL = process.env.ADMIN_EMAIL || "admin@kassius.local";
const PASSWORD = process.env.ADMIN_PASSWORD || "kassiusadmin123";
const MARKER = `audit-${Date.now()}`;
const STAFF_EMAIL = `${MARKER}@kassius.local`;
const STAFF_PASSWORD = "auditoria123";

const prisma = new PrismaClient();

const created = {
  productId: "",
  recipeId: "",
  inventoryId: "",
  staffId: "",
  beerId: "",
  beerRecipeId: "",
  quickInventoryId: "",
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

class Client {
  private jar = new Map<string, string>();

  constructor(private ip: string) {}

  async request(path: string, init: { method?: string; body?: unknown } = {}) {
    const response = await fetch(`${BASE}${path}`, {
      method: init.method || "GET",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": this.ip,
        Cookie: Array.from(this.jar.entries())
          .map(([key, value]) => `${key}=${value}`)
          .join("; "),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    for (const cookie of response.headers.getSetCookie?.() ?? []) {
      const [pair] = cookie.split(";");
      const eq = pair.indexOf("=");
      if (eq > 0) {
        this.jar.set(pair.slice(0, eq), pair.slice(eq + 1));
      }
    }
    const text = new TextDecoder("utf-8", { ignoreBOM: true }).decode(await response.arrayBuffer());
    let body: any = text;
    try {
      body = JSON.parse(text.replace(/^\uFEFF/, ""));
    } catch {}
    return { status: response.status, body, text, headers: response.headers };
  }

  async login(email: string, password: string) {
    const res = await this.request("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    assert(res.status === 200, `Login ${email} falhou: ${res.status} ${res.text}`);
    return res.body;
  }
}

async function stockOf(productId: string) {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  return product.currentStock;
}

async function cleanup() {
  if (created.quickInventoryId) {
    await prisma.stockMovement.updateMany({
      where: { inventoryId: created.quickInventoryId },
      data: { inventoryId: null },
    });
    await prisma.inventoryItem.deleteMany({ where: { inventoryId: created.quickInventoryId } });
    await prisma.inventoryCount.deleteMany({ where: { id: created.quickInventoryId } });
  }
  if (created.beerId) {
    await prisma.stockMovement.deleteMany({ where: { productId: created.beerId } });
    await prisma.inventoryItem.deleteMany({ where: { productId: created.beerId } });
  }
  if (created.beerRecipeId) {
    await prisma.sale.deleteMany({ where: { recipeId: created.beerRecipeId } });
    await prisma.recipeItem.deleteMany({ where: { recipeId: created.beerRecipeId } });
    await prisma.recipe.deleteMany({ where: { id: created.beerRecipeId } });
  }
  if (created.beerId) {
    await prisma.product.deleteMany({ where: { id: created.beerId } });
  }
  if (created.productId) {
    await prisma.stockMovement.deleteMany({ where: { productId: created.productId } });
    await prisma.inventoryItem.deleteMany({ where: { productId: created.productId } });
  }
  if (created.recipeId) {
    await prisma.sale.deleteMany({ where: { recipeId: created.recipeId } });
    await prisma.recipeItem.deleteMany({ where: { recipeId: created.recipeId } });
    await prisma.recipe.deleteMany({ where: { id: created.recipeId } });
  }
  if (created.inventoryId) {
    await prisma.stockMovement.updateMany({
      where: { inventoryId: created.inventoryId },
      data: { inventoryId: null },
    });
    await prisma.inventoryItem.deleteMany({ where: { inventoryId: created.inventoryId } });
    await prisma.inventoryCount.deleteMany({ where: { id: created.inventoryId } });
  }
  if (created.productId) {
    await prisma.product.deleteMany({ where: { id: created.productId } });
  }
  if (created.staffId) {
    await prisma.user.deleteMany({ where: { id: created.staffId } });
  }
}

async function main() {
  const admin = new Client("203.0.113.10");
  const staff = new Client("203.0.113.11");
  const anonymous = new Client("203.0.113.12");

  console.log("0) Saúde do app...");
  const health = await anonymous.request("/login");
  assert(health.status === 200, `App fora do ar: ${health.status}`);

  console.log("1) Sem sessão a API responde 401...");
  for (const path of ["/api/produtos", "/api/vendas", "/api/relatorios"]) {
    const res = await anonymous.request(path);
    assert(res.status === 401, `${path} sem sessão deveria ser 401, veio ${res.status}`);
  }
  const wrong = await anonymous.request("/api/auth/login", {
    method: "POST",
    body: { email: EMAIL, password: "senha-errada" },
  });
  assert(wrong.status === 401, `senha errada deveria ser 401, veio ${wrong.status}`);

  console.log("2) Login admin...");
  const adminLogin = await admin.login(EMAIL, PASSWORD);
  assert(adminLogin.role === "ADMIN", `perfil do admin veio ${adminLogin.role}`);

  const openBefore = await prisma.inventoryCount.findFirst({ where: { status: "ABERTO" } });
  assert(!openBefore, "Já existe uma contagem aberta; feche-a antes de rodar a auditoria.");

  console.log("3) Cadastro de produto...");
  const productBody = {
    name: `Gin ${MARKER}`,
    category: "Pinga e destilados",
    unit: "ML",
    packageLabel: "garrafa",
    packageSize: 1000,
    costCents: 10000,
    minStock: 2000,
    barcode: null,
    supplierId: null,
  };
  const product = await admin.request("/api/produtos", { method: "POST", body: productBody });
  assert(product.status === 201 && product.body.id, `criar produto: ${product.status} ${product.text}`);
  created.productId = product.body.id;
  const duplicate = await admin.request("/api/produtos", { method: "POST", body: productBody });
  assert(duplicate.status === 409, `nome duplicado deveria ser 409, veio ${duplicate.status}`);
  const invalid = await admin.request("/api/produtos", {
    method: "POST",
    body: { ...productBody, name: `${productBody.name} x`, packageSize: 0 },
  });
  assert(invalid.status === 400, `embalagem zero deveria ser 400, veio ${invalid.status}`);
  assert((await stockOf(created.productId)) === 0, "produto novo deveria começar zerado");

  console.log("4) Entrada de 3 garrafas pagando R$ 330,00...");
  const entry = await admin.request("/api/movimentacoes", {
    method: "POST",
    body: { productId: created.productId, type: "ENTRADA", quantity: 3000, costCents: 33000, note: "NF auditoria" },
  });
  assert(entry.status === 201, `entrada: ${entry.status} ${entry.text}`);
  const afterEntry = await prisma.product.findUniqueOrThrow({ where: { id: created.productId } });
  assert(afterEntry.currentStock === 3000, `estoque após entrada ${afterEntry.currentStock}`);
  assert(afterEntry.costCents === 11000, `custo por garrafa deveria virar 11000, veio ${afterEntry.costCents}`);

  console.log("5) Ficha técnica: 50 ml por drink a R$ 25,00...");
  const recipe = await admin.request("/api/cardapio", {
    method: "POST",
    body: {
      name: `Drink ${MARKER}`,
      category: "Caipirinhas",
      priceCents: 2500,
      items: [{ productId: created.productId, quantity: 50 }],
    },
  });
  assert(recipe.status === 201 && recipe.body.id, `criar drink: ${recipe.status} ${recipe.text}`);
  created.recipeId = recipe.body.id;
  const recipes = await admin.request("/api/cardapio");
  const listed = recipes.body.recipes.find((item: { id: string }) => item.id === created.recipeId);
  assert(listed, "drink não aparece na lista");
  assert(listed.costCents === 550, `custo do drink deveria ser 550, veio ${listed.costCents}`);
  assert(listed.marginCents === 1950, `margem deveria ser 1950, veio ${listed.marginCents}`);
  assert(listed.marginPct === 78, `margem % deveria ser 78, veio ${listed.marginPct}`);
  assert(listed.available === 60, `porções disponíveis deveriam ser 60, veio ${listed.available}`);

  console.log("6) Venda de 4 drinks baixa o insumo...");
  const sale = await admin.request("/api/vendas", {
    method: "POST",
    body: { recipeId: created.recipeId, quantity: 4 },
  });
  assert(sale.status === 201 && sale.body.totalCents === 10000, `venda: ${sale.status} ${sale.text}`);
  assert((await stockOf(created.productId)) === 2800, "estoque após venda deveria ser 2800");
  const saleRow = await prisma.sale.findUniqueOrThrow({ where: { id: sale.body.id } });
  assert(saleRow.priceCents === 10000 && saleRow.costCents === 2200, "valores da venda divergentes no banco");
  const saleMovement = await prisma.stockMovement.findFirst({ where: { saleId: sale.body.id } });
  assert(saleMovement?.type === "VENDA" && saleMovement.quantity === -200, "movimento de venda divergente");

  console.log("7) Venda sem estoque é recusada sem mexer no saldo...");
  const tooBig = await admin.request("/api/vendas", {
    method: "POST",
    body: { recipeId: created.recipeId, quantity: 100 },
  });
  assert(tooBig.status === 409, `venda maior que o estoque deveria ser 409, veio ${tooBig.status}`);
  assert(String(tooBig.body.error).includes("Estoque insuficiente"), `mensagem: ${tooBig.text}`);
  assert((await stockOf(created.productId)) === 2800, "venda recusada alterou o estoque");

  console.log("8) Perdas...");
  const noNote = await admin.request("/api/movimentacoes", {
    method: "POST",
    body: { productId: created.productId, type: "PERDA", quantity: 300 },
  });
  assert(noNote.status === 400, `perda sem motivo deveria ser 400, veio ${noNote.status}`);
  const loss = await admin.request("/api/movimentacoes", {
    method: "POST",
    body: { productId: created.productId, type: "PERDA", quantity: 300, note: "Garrafa quebrou" },
  });
  assert(loss.status === 201 && loss.body.currentStock === 2500, `perda: ${loss.status} ${loss.text}`);
  const hugeLoss = await admin.request("/api/movimentacoes", {
    method: "POST",
    body: { productId: created.productId, type: "PERDA", quantity: 999999, note: "teste" },
  });
  assert(hugeLoss.status === 409, `perda maior que o estoque deveria ser 409, veio ${hugeLoss.status}`);
  assert((await stockOf(created.productId)) === 2500, "estoque após perdas deveria ser 2500");

  console.log("9) Funcionário: cadastro e permissões...");
  const newUser = await admin.request("/api/usuarios", {
    method: "POST",
    body: { name: "Funcionário Auditoria", email: STAFF_EMAIL, password: STAFF_PASSWORD, role: "STAFF" },
  });
  assert(newUser.status === 201 && newUser.body.id, `criar usuário: ${newUser.status} ${newUser.text}`);
  created.staffId = newUser.body.id;
  const staffLogin = await staff.login(STAFF_EMAIL, STAFF_PASSWORD);
  assert(staffLogin.role === "STAFF", `perfil do funcionário veio ${staffLogin.role}`);

  const forbidden: Array<[string, string, unknown?]> = [
    ["POST", "/api/produtos", { ...productBody, name: `${productBody.name} staff` }],
    ["GET", "/api/relatorios"],
    ["GET", "/api/usuarios"],
    ["GET", "/api/fornecedores"],
    ["POST", "/api/cardapio", { name: "x", category: "Caipirinhas", priceCents: 1, items: [] }],
  ];
  for (const [method, path, body] of forbidden) {
    const res = await staff.request(path, { method, body });
    assert(res.status === 403, `funcionário em ${method} ${path} deveria ser 403, veio ${res.status}`);
  }
  const staffEntry = await staff.request("/api/movimentacoes", {
    method: "POST",
    body: { productId: created.productId, type: "ENTRADA", quantity: 1000 },
  });
  assert(staffEntry.status === 403, `entrada pelo funcionário deveria ser 403, veio ${staffEntry.status}`);
  const staffLoss = await staff.request("/api/movimentacoes", {
    method: "POST",
    body: { productId: created.productId, type: "PERDA", quantity: 100, note: "Derramou" },
  });
  assert(staffLoss.status === 201, `perda pelo funcionário: ${staffLoss.status} ${staffLoss.text}`);
  const staffSale = await staff.request("/api/vendas", {
    method: "POST",
    body: { recipeId: created.recipeId, quantity: 1 },
  });
  assert(staffSale.status === 201, `venda pelo funcionário: ${staffSale.status} ${staffSale.text}`);
  assert((await stockOf(created.productId)) === 2350, "estoque após ações do funcionário deveria ser 2350");
  const staffPanel = await staff.request("/api/painel");
  assert(staffPanel.status === 200, `painel do funcionário: ${staffPanel.status}`);
  assert(!("summary" in staffPanel.body), "painel do funcionário não deveria trazer faturamento");

  console.log("10) Inventário: conta 2 garrafas e o admin fecha...");
  const opened = await staff.request("/api/inventarios", { method: "POST" });
  assert(opened.status === 201 && opened.body.id, `abrir contagem: ${opened.status} ${opened.text}`);
  created.inventoryId = opened.body.id;
  const reopened = await admin.request("/api/inventarios", { method: "POST" });
  assert(reopened.body.id === created.inventoryId, "abrir de novo deveria reaproveitar a contagem aberta");
  const saved = await staff.request(`/api/inventarios/${created.inventoryId}`, {
    method: "PATCH",
    body: { items: [{ productId: created.productId, counted: 2000 }] },
  });
  assert(saved.status === 200, `salvar contagem: ${saved.status} ${saved.text}`);
  const detail = await admin.request(`/api/inventarios/${created.inventoryId}`);
  const item = detail.body.inventory.items.find(
    (row: { productId: string }) => row.productId === created.productId
  );
  assert(item.difference === -350, `diferença deveria ser -350, veio ${item.difference}`);
  assert(item.differenceCents === -3850, `diferença em R$ deveria ser -3850, veio ${item.differenceCents}`);
  const staffClose = await staff.request(`/api/inventarios/${created.inventoryId}`, { method: "POST" });
  assert(staffClose.status === 403, `funcionário fechando deveria ser 403, veio ${staffClose.status}`);
  const closed = await admin.request(`/api/inventarios/${created.inventoryId}`, { method: "POST" });
  assert(closed.status === 200 && closed.body.adjusted >= 1, `fechar contagem: ${closed.status} ${closed.text}`);
  assert((await stockOf(created.productId)) === 2000, "estoque após inventário deveria ser 2000");
  const adjustment = await prisma.stockMovement.findFirst({
    where: { productId: created.productId, type: "AJUSTE", inventoryId: created.inventoryId },
  });
  assert(adjustment?.quantity === -350 && adjustment.costCents === 3850, "ajuste de inventário divergente");
  const closedAgain = await admin.request(`/api/inventarios/${created.inventoryId}`, { method: "POST" });
  assert(closedAgain.status === 409, `fechar duas vezes deveria ser 409, veio ${closedAgain.status}`);

  console.log("11) Saldo bate com a soma das movimentações...");
  const sum = await prisma.stockMovement.aggregate({
    where: { productId: created.productId },
    _sum: { quantity: true },
  });
  assert(sum._sum.quantity === 2000, `soma das movimentações ${sum._sum.quantity} != saldo 2000`);

  console.log("12) Relatório de 1 dia...");
  const report = await admin.request("/api/relatorios?dias=1");
  assert(report.status === 200, `relatório: ${report.status}`);
  const r = report.body;
  const dailyRevenue = r.daily.reduce((total: number, row: { revenueCents: number }) => total + row.revenueCents, 0);
  const dailyCmv = r.daily.reduce((total: number, row: { cmvCents: number }) => total + row.cmvCents, 0);
  assert(dailyRevenue === r.summary.revenueCents, "faturamento diário não soma o total");
  assert(dailyCmv === r.summary.cmvCents, "CMV diário não soma o total");
  assert(r.summary.grossMarginCents === r.summary.revenueCents - r.summary.cmvCents, "lucro bruto divergente");
  const expectedPct = r.summary.revenueCents > 0
    ? Math.round((r.summary.cmvCents / r.summary.revenueCents) * 1000) / 10
    : 0;
  assert(r.summary.cmvPct === expectedPct, `CMV% ${r.summary.cmvPct} != ${expectedPct}`);

  const recipeSales = await prisma.sale.aggregate({
    where: { recipeId: created.recipeId },
    _sum: { quantity: true, priceCents: true, costCents: true },
  });
  assert(
    recipeSales._sum.quantity === 5 && recipeSales._sum.priceCents === 12500 && recipeSales._sum.costCents === 2750,
    `vendas do item no banco: ${JSON.stringify(recipeSales._sum)}`
  );
  const top = r.topItems.find((row: { name: string }) => row.name === `Drink ${MARKER}`);
  assert(!top || (top.quantity === 5 && top.revenueCents === 12500 && top.costCents === 2750), `item no ranking: ${JSON.stringify(top)}`);

  const lossRows = r.losses.filter((row: { product: string }) => row.product === productBody.name);
  const lossTotal = lossRows.reduce((total: number, row: { costCents: number }) => total + row.costCents, 0);
  assert(lossRows.length === 3 && lossTotal === 8250, `perdas do produto: ${lossRows.length} linhas, ${lossTotal}`);

  const stockRow = r.stock.find((row: { id: string }) => row.id === created.productId);
  assert(stockRow.status === "BAIXO", `status deveria ser BAIXO, veio ${stockRow.status}`);
  assert(stockRow.consumed === 250, `consumo deveria ser 250, veio ${stockRow.consumed}`);
  assert(stockRow.coverageDays === 8, `cobertura deveria ser 8 dias, veio ${stockRow.coverageDays}`);
  assert(stockRow.stockValueCents === 22000, `valor em estoque deveria ser 22000, veio ${stockRow.stockValueCents}`);
  const shopping = r.shoppingList.find((row: { id: string }) => row.id === created.productId);
  assert(shopping?.suggestedPackages === 2 && shopping.estimatedCents === 22000, `lista de compras: ${JSON.stringify(shopping)}`);
  const abc = r.abc.find((row: { productId: string }) => row.productId === created.productId);
  assert(abc?.valueCents === 2750, `curva ABC: ${JSON.stringify(abc)}`);
  const abcShare = r.abc.reduce((total: number, row: { share: number }) => total + row.share, 0);
  assert(Math.abs(abcShare - 100) < 1, `participação ABC soma ${abcShare}`);

  console.log("13) CSV do estoque...");
  const csv = await admin.request("/api/relatorios?dias=1&format=csv");
  assert(csv.status === 200, `CSV: ${csv.status}`);
  assert((csv.headers.get("content-type") || "").includes("text/csv"), "Content-Type do CSV inválido");
  assert(csv.text.charCodeAt(0) === 0xfeff, "CSV sem BOM para o Excel");
  assert(csv.text.slice(1).startsWith("produto;categoria;fornecedor;estoque"), "cabeçalho do CSV errado");
  const csvLine = csv.text.split("\n").find((line) => line.startsWith(productBody.name));
  assert(csvLine && csvLine.includes("220,00") && csvLine.includes("2 garrafa"), `linha do CSV: ${csvLine}`);

  console.log("14) Cerveja retornável: custo médio, garrafas vazias e estoque ideal...");
  const beerBody = {
    name: `Cerveja ${MARKER}`,
    category: "Cervejas",
    unit: "UN",
    packageLabel: "engradado",
    packageSize: 24,
    costCents: 2400,
    minStock: 24,
    targetStock: 96,
    returnable: true,
    depositCents: 100,
    barcode: null,
    supplierId: null,
  };
  const mlReturnable = await admin.request("/api/produtos", {
    method: "POST",
    body: { ...productBody, name: `${productBody.name} retornavel`, returnable: true },
  });
  assert(mlReturnable.status === 400, `retornável em ml deveria ser 400, veio ${mlReturnable.status}`);
  const lowTarget = await admin.request("/api/produtos", {
    method: "POST",
    body: { ...beerBody, targetStock: 24 },
  });
  assert(lowTarget.status === 400, `ideal igual ao mínimo deveria ser 400, veio ${lowTarget.status}`);
  const beer = await admin.request("/api/produtos", { method: "POST", body: beerBody });
  assert(beer.status === 201 && beer.body.id, `criar cerveja: ${beer.status} ${beer.text}`);
  created.beerId = beer.body.id;

  const beerEntry = (quantity: number, costCents: number, emptiesOut?: number) =>
    admin.request("/api/movimentacoes", {
      method: "POST",
      body: { productId: created.beerId, type: "ENTRADA", quantity, costCents, emptiesOut, note: "auditoria" },
    });
  assert((await beerEntry(24, 2400)).status === 201, "primeira entrada da cerveja falhou");
  assert((await beerEntry(24, 3600)).status === 201, "segunda entrada da cerveja falhou");
  const averaged = await prisma.product.findUniqueOrThrow({ where: { id: created.beerId } });
  assert(averaged.currentStock === 48, `estoque da cerveja ${averaged.currentStock}`);
  assert(averaged.costCents === 3000, `custo médio deveria ser 3000, veio ${averaged.costCents}`);

  const beerRecipe = await admin.request("/api/cardapio", {
    method: "POST",
    body: {
      name: `Cerveja ${MARKER}`,
      category: "Cervejas",
      priceCents: 1000,
      items: [{ productId: created.beerId, quantity: 1 }],
    },
  });
  assert(beerRecipe.status === 201, `cerveja no cardápio: ${beerRecipe.status} ${beerRecipe.text}`);
  created.beerRecipeId = beerRecipe.body.id;
  const beerSale = await staff.request("/api/vendas", {
    method: "POST",
    body: { recipeId: created.beerRecipeId, quantity: 5 },
  });
  assert(beerSale.status === 201, `venda de cerveja: ${beerSale.status} ${beerSale.text}`);
  const afterBeerSale = await prisma.product.findUniqueOrThrow({ where: { id: created.beerId } });
  assert(afterBeerSale.currentStock === 43 && afterBeerSale.emptyStock === 5, `cheias ${afterBeerSale.currentStock}, vazios ${afterBeerSale.emptyStock}`);

  const tooManyEmpties = await beerEntry(24, 3000, 10);
  assert(tooManyEmpties.status === 409, `devolver mais vazias do que tem deveria ser 409, veio ${tooManyEmpties.status}`);
  assert((await stockOf(created.beerId)) === 43, "entrada recusada alterou o estoque");
  const ginEmpties = await admin.request("/api/movimentacoes", {
    method: "POST",
    body: { productId: created.productId, type: "ENTRADA", quantity: 1000, emptiesOut: 1 },
  });
  assert(ginEmpties.status === 400, `vazias em produto não retornável deveria ser 400, veio ${ginEmpties.status}`);
  const lossEmpties = await admin.request("/api/movimentacoes", {
    method: "POST",
    body: { productId: created.beerId, type: "PERDA", quantity: 1, emptiesOut: 1, note: "x" },
  });
  assert(lossEmpties.status === 400, `vazias na perda deveria ser 400, veio ${lossEmpties.status}`);
  assert((await beerEntry(24, 3000, 3)).status === 201, "entrada com garrafas devolvidas falhou");
  const afterReturn = await prisma.product.findUniqueOrThrow({ where: { id: created.beerId } });
  assert(afterReturn.currentStock === 67 && afterReturn.emptyStock === 2, `cheias ${afterReturn.currentStock}, vazios ${afterReturn.emptyStock}`);
  assert(afterReturn.costCents === 3000, `custo médio deveria seguir 3000, veio ${afterReturn.costCents}`);

  const staffEmpties = await staff.request(`/api/produtos/${created.beerId}/garrafas`, { method: "PATCH", body: { emptyStock: 9 } });
  assert(staffEmpties.status === 403, `funcionário corrigindo vazias deveria ser 403, veio ${staffEmpties.status}`);
  const badEmpties = await admin.request(`/api/produtos/${created.beerId}/garrafas`, { method: "PATCH", body: { emptyStock: -1 } });
  assert(badEmpties.status === 400, `vazias negativas deveriam ser 400, veio ${badEmpties.status}`);
  const fixEmpties = await admin.request(`/api/produtos/${created.beerId}/garrafas`, { method: "PATCH", body: { emptyStock: 7 } });
  assert(fixEmpties.status === 200, `corrigir vazias: ${fixEmpties.status} ${fixEmpties.text}`);

  const report2 = (await admin.request("/api/relatorios?dias=1")).body;
  const emptiesRow = report2.empties.find((row: { id: string }) => row.id === created.beerId);
  assert(emptiesRow?.emptyStock === 7 && emptiesRow.valueCents === 700, `vazias no relatório: ${JSON.stringify(emptiesRow)}`);
  const beerStock = report2.stock.find((row: { id: string }) => row.id === created.beerId);
  assert(beerStock.targetStock === 96, `estoque ideal no relatório: ${beerStock.targetStock}`);
  const staffRow = report2.staffSales.find((row: { name: string }) => row.name === "Funcionário Auditoria");
  assert(staffRow?.sales === 2 && staffRow.items === 6 && staffRow.revenueCents === 7500, `vendas do funcionário: ${JSON.stringify(staffRow)}`);
  const noSupplier = report2.supplierOrders.find((row: { supplier: string }) => row.supplier === "Sem fornecedor");
  assert(noSupplier?.text.includes(`2 garrafa de ${productBody.name}`), `pedido sem fornecedor: ${JSON.stringify(noSupplier)}`);
  assert(noSupplier.link.startsWith("https://wa.me/?text="), `link do WhatsApp: ${noSupplier.link}`);

  console.log("15) Contagem rápida só de cervejas e diferença sobre as vendas...");
  const badCategory = await staff.request("/api/inventarios", { method: "POST", body: { categories: ["Vinhos"] } });
  assert(badCategory.status === 400, `categoria inválida deveria ser 400, veio ${badCategory.status}`);
  const quick = await staff.request("/api/inventarios", { method: "POST", body: { categories: ["Cervejas"] } });
  assert(quick.status === 201 && quick.body.id, `contagem rápida: ${quick.status} ${quick.text}`);
  created.quickInventoryId = quick.body.id;
  const quickSaved = await staff.request(`/api/inventarios/${created.quickInventoryId}`, {
    method: "PATCH",
    body: { items: [{ productId: created.beerId, counted: 65 }] },
  });
  assert(quickSaved.status === 200, `salvar contagem rápida: ${quickSaved.status}`);
  const quickDetail = (await admin.request(`/api/inventarios/${created.quickInventoryId}`)).body.inventory;
  assert(quickDetail.categories.join() === "Cervejas", `categorias da contagem: ${quickDetail.categories}`);
  assert(
    quickDetail.items.every((row: { product: { category: string } }) => row.product.category === "Cervejas"),
    "contagem rápida trouxe produto de outra categoria"
  );
  const beerCount = quickDetail.items.find((row: { productId: string }) => row.productId === created.beerId);
  assert(beerCount.difference === -2 && beerCount.sold === 5, `contagem da cerveja: ${JSON.stringify(beerCount)}`);
  assert(beerCount.variancePct === -40, `diferença % deveria ser -40, veio ${beerCount.variancePct}`);
  const quickClosed = await admin.request(`/api/inventarios/${created.quickInventoryId}`, { method: "POST" });
  assert(quickClosed.status === 200, `fechar contagem rápida: ${quickClosed.status}`);
  assert((await stockOf(created.beerId)) === 65, "estoque da cerveja após contagem deveria ser 65");

  console.log("16) Cancelar venda devolve o estoque e sai do faturamento...");
  const ginBefore = await stockOf(created.productId);
  const toCancel = await staff.request("/api/vendas", {
    method: "POST",
    body: { recipeId: created.recipeId, quantity: 2 },
  });
  assert(toCancel.status === 201, `venda para cancelar: ${toCancel.status} ${toCancel.text}`);
  assert((await stockOf(created.productId)) === ginBefore - 100, "venda para cancelar não baixou o estoque");
  const canceled = await staff.request(`/api/vendas/${toCancel.body.id}`, { method: "DELETE" });
  assert(canceled.status === 200, `cancelar venda própria: ${canceled.status} ${canceled.text}`);
  assert((await stockOf(created.productId)) === ginBefore, "cancelar não devolveu o estoque");
  const canceledRow = await prisma.sale.findUniqueOrThrow({ where: { id: toCancel.body.id } });
  assert(canceledRow.canceledAt && canceledRow.canceledById === created.staffId, "venda não ficou marcada como cancelada");
  const cancelAgain = await staff.request(`/api/vendas/${toCancel.body.id}`, { method: "DELETE" });
  assert(cancelAgain.status === 409, `cancelar duas vezes deveria ser 409, veio ${cancelAgain.status}`);
  const ginSum = await prisma.stockMovement.aggregate({ where: { productId: created.productId }, _sum: { quantity: true } });
  assert(ginSum._sum.quantity === ginBefore, `soma das movimentações ${ginSum._sum.quantity} != saldo ${ginBefore}`);

  const adminBeer = await admin.request("/api/vendas", {
    method: "POST",
    body: { recipeId: created.beerRecipeId, quantity: 1 },
  });
  assert(adminBeer.status === 201, `venda de cerveja do admin: ${adminBeer.status}`);
  const beforeCancel = await prisma.product.findUniqueOrThrow({ where: { id: created.beerId } });
  assert(beforeCancel.currentStock === 64 && beforeCancel.emptyStock === 8, `cerveja antes de cancelar: ${beforeCancel.currentStock}/${beforeCancel.emptyStock}`);
  const staffCancelOther = await staff.request(`/api/vendas/${adminBeer.body.id}`, { method: "DELETE" });
  assert(staffCancelOther.status === 403, `funcionário cancelando venda de outro deveria ser 403, veio ${staffCancelOther.status}`);
  const adminCancel = await admin.request(`/api/vendas/${adminBeer.body.id}`, { method: "DELETE" });
  assert(adminCancel.status === 200, `admin cancelando: ${adminCancel.status}`);
  const afterCancel = await prisma.product.findUniqueOrThrow({ where: { id: created.beerId } });
  assert(afterCancel.currentStock === 65 && afterCancel.emptyStock === 7, `cerveja depois de cancelar: ${afterCancel.currentStock}/${afterCancel.emptyStock}`);
  const report3 = (await admin.request("/api/relatorios?dias=1")).body;
  const staffRow3 = report3.staffSales.find((row: { name: string }) => row.name === "Funcionário Auditoria");
  assert(staffRow3?.sales === 2 && staffRow3.revenueCents === 7500, `venda cancelada entrou no relatório: ${JSON.stringify(staffRow3)}`);

  console.log("17) Troca de senha...");
  const wrongCurrent = await staff.request("/api/conta/senha", { method: "POST", body: { current: "errada123", password: "novasenha123" } });
  assert(wrongCurrent.status === 400, `senha atual errada deveria ser 400, veio ${wrongCurrent.status}`);
  const shortPassword = await staff.request("/api/conta/senha", { method: "POST", body: { current: STAFF_PASSWORD, password: "curta" } });
  assert(shortPassword.status === 400, `senha curta deveria ser 400, veio ${shortPassword.status}`);
  const changed = await staff.request("/api/conta/senha", { method: "POST", body: { current: STAFF_PASSWORD, password: "novasenha123" } });
  assert(changed.status === 200, `trocar senha: ${changed.status} ${changed.text}`);
  await new Client("203.0.113.13").login(STAFF_EMAIL, "novasenha123");
  const staffReset = await staff.request(`/api/usuarios/${created.staffId}`, { method: "PATCH", body: { password: "outrasenha123" } });
  assert(staffReset.status === 403, `funcionário redefinindo senha deveria ser 403, veio ${staffReset.status}`);
  const adminReset = await admin.request(`/api/usuarios/${created.staffId}`, { method: "PATCH", body: { password: "outrasenha123" } });
  assert(adminReset.status === 200, `admin redefinindo senha: ${adminReset.status} ${adminReset.text}`);
  await new Client("203.0.113.14").login(STAFF_EMAIL, "outrasenha123");

  console.log("18) Funcionário desativado perde o acesso na hora...");
  const deactivate = await admin.request(`/api/usuarios/${created.staffId}`, {
    method: "PATCH",
    body: { active: false },
  });
  assert(deactivate.status === 200, `desativar: ${deactivate.status} ${deactivate.text}`);
  const afterDeactivate = await staff.request("/api/vendas");
  assert(afterDeactivate.status === 401, `sessão de inativo deveria ser 401, veio ${afterDeactivate.status}`);

  console.log("");
  console.log("OK — estoque, vendas, cancelamentos, perdas, garrafas retornáveis, contagens, senhas, permissões e relatórios consistentes");
}

main()
  .catch((error) => {
    console.error("FALHA:", error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup().catch((error) => console.error("Limpeza falhou:", error.message || error));
    await prisma.$disconnect();
  });
