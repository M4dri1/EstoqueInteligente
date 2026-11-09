import { productRepository } from "@/lib/repositories/product-repository";
import { movementRepository } from "@/lib/repositories/movement-repository";
import { saleRepository } from "@/lib/repositories/sale-repository";
import { inventoryRepository } from "@/lib/repositories/inventory-repository";
import {
  buildAbcCurve,
  coverageDays,
  stockStatus,
  suggestedPackages,
  targetOf,
  valueCents,
} from "@/lib/stock";
import { formatBase, formatStock } from "@/lib/format";
import { orderText, whatsappLink } from "@/lib/whatsapp";

function dayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const reportService = {
  async build(days: number) {
    const since = new Date(Date.now() - days * 86_400_000);
    const [products, sales, consumption, losses] = await Promise.all([
      productRepository.list(),
      saleRepository.since(since),
      movementRepository.sumByProduct("VENDA", since),
      movementRepository.lossesSince(since),
    ]);

    const revenueCents = sales.reduce((sum, sale) => sum + sale.priceCents, 0);
    const cmvCents = sales.reduce((sum, sale) => sum + sale.costCents, 0);
    const lossCents = losses.reduce((sum, row) => sum + row.costCents, 0);
    const itemsSold = sales.reduce((sum, sale) => sum + sale.quantity, 0);

    const consumedBy = new Map(
      consumption.map((row) => [
        row.productId,
        { quantity: Math.abs(row._sum.quantity ?? 0), costCents: row._sum.costCents ?? 0 },
      ])
    );

    const byDay = new Map<string, { revenueCents: number; cmvCents: number }>();
    for (const sale of sales) {
      const key = dayKey(sale.createdAt);
      const bucket = byDay.get(key) || { revenueCents: 0, cmvCents: 0 };
      bucket.revenueCents += sale.priceCents;
      bucket.cmvCents += sale.costCents;
      byDay.set(key, bucket);
    }

    const byRecipe = new Map<string, { name: string; quantity: number; revenueCents: number; costCents: number }>();
    for (const sale of sales) {
      const bucket = byRecipe.get(sale.recipeId) || {
        name: sale.recipe.name,
        quantity: 0,
        revenueCents: 0,
        costCents: 0,
      };
      bucket.quantity += sale.quantity;
      bucket.revenueCents += sale.priceCents;
      bucket.costCents += sale.costCents;
      byRecipe.set(sale.recipeId, bucket);
    }

    const stock = products.map((product) => {
      const consumed = consumedBy.get(product.id)?.quantity ?? 0;
      return {
        id: product.id,
        name: product.name,
        category: product.category,
        unit: product.unit,
        packageLabel: product.packageLabel,
        packageSize: product.packageSize,
        costCents: product.costCents,
        currentStock: product.currentStock,
        minStock: product.minStock,
        targetStock: targetOf(product),
        returnable: product.returnable,
        emptyStock: product.emptyStock,
        depositCents: product.depositCents,
        supplier: product.supplier?.name ?? null,
        supplierPhone: product.supplier?.phone ?? null,
        status: stockStatus(product),
        stockValueCents: valueCents(Math.max(product.currentStock, 0), product),
        consumed,
        coverageDays: coverageDays(product.currentStock, consumed, days),
        suggestedPackages: suggestedPackages(product),
      };
    });

    const shoppingList = stock
      .filter((row) => row.suggestedPackages > 0)
      .map((row) => ({
        ...row,
        estimatedCents: row.suggestedPackages * row.costCents,
      }))
      .sort((left, right) => left.currentStock / Math.max(left.minStock, 1) - right.currentStock / Math.max(right.minStock, 1));

    const ordersBySupplier = new Map<string, typeof shoppingList>();
    for (const row of shoppingList) {
      const key = row.supplier ?? "Sem fornecedor";
      ordersBySupplier.set(key, [...(ordersBySupplier.get(key) ?? []), row]);
    }
    const supplierOrders = Array.from(ordersBySupplier.entries())
      .map(([supplier, rows]) => {
        const text = orderText(
          supplier,
          rows.map((row) => ({
            name: row.name,
            packages: row.suggestedPackages,
            packageLabel: row.packageLabel,
          }))
        );
        const phone = rows[0].supplierPhone;
        return {
          supplier,
          phone,
          items: rows.length,
          estimatedCents: rows.reduce((sum, row) => sum + row.estimatedCents, 0),
          text,
          link: whatsappLink(phone, text),
        };
      })
      .sort((left, right) => right.estimatedCents - left.estimatedCents);

    const empties = stock
      .filter((row) => row.returnable)
      .map((row) => ({
        id: row.id,
        name: row.name,
        unit: row.unit,
        packageLabel: row.packageLabel,
        packageSize: row.packageSize,
        currentStock: row.currentStock,
        emptyStock: row.emptyStock,
        depositCents: row.depositCents,
        valueCents: row.emptyStock * row.depositCents,
      }));

    const byUser = new Map<string, { name: string; sales: number; items: number; revenueCents: number }>();
    for (const sale of sales) {
      const bucket = byUser.get(sale.userId) || {
        name: sale.user.name,
        sales: 0,
        items: 0,
        revenueCents: 0,
      };
      bucket.sales += 1;
      bucket.items += sale.quantity;
      bucket.revenueCents += sale.priceCents;
      byUser.set(sale.userId, bucket);
    }

    return {
      days,
      summary: {
        revenueCents,
        cmvCents,
        cmvPct: revenueCents > 0 ? Math.round((cmvCents / revenueCents) * 1000) / 10 : 0,
        grossMarginCents: revenueCents - cmvCents,
        lossCents,
        itemsSold,
        stockValueCents: stock.reduce((sum, row) => sum + row.stockValueCents, 0),
        lowStockCount: stock.filter((row) => row.status !== "OK").length,
      },
      daily: Array.from(byDay.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([date, bucket]) => ({ date, ...bucket })),
      topItems: Array.from(byRecipe.values())
        .sort((left, right) => right.quantity - left.quantity || right.revenueCents - left.revenueCents)
        .slice(0, 10),
      abc: buildAbcCurve(
        products.map((product) => ({
          productId: product.id,
          name: product.name,
          valueCents: consumedBy.get(product.id)?.costCents ?? 0,
        }))
      ),
      stock,
      shoppingList,
      supplierOrders,
      empties,
      staffSales: Array.from(byUser.values()).sort(
        (left, right) => right.revenueCents - left.revenueCents
      ),
      losses: losses.map((row) => ({
        id: row.id,
        createdAt: row.createdAt,
        product: row.product.name,
        quantity: formatBase(Math.abs(row.quantity), row.product.unit),
        type: row.type,
        note: row.note,
        costCents: row.costCents,
      })),
    };
  },

  async dashboard() {
    const report = await this.build(7);
    const [recent, lastCount] = await Promise.all([
      movementRepository.list({ limit: 8 }),
      inventoryRepository.findLatest(),
    ]);
    return {
      summary: report.summary,
      empties: {
        bottles: report.empties.reduce((sum, row) => sum + row.emptyStock, 0),
        valueCents: report.empties.reduce((sum, row) => sum + row.valueCents, 0),
        rows: report.empties.map((row) => ({ name: row.name, emptyStock: row.emptyStock })),
      },
      orders: {
        suppliers: report.supplierOrders.length,
        estimatedCents: report.supplierOrders.reduce((sum, row) => sum + row.estimatedCents, 0),
      },
      lastCount,
      daily: report.daily,
      topItems: report.topItems.slice(0, 5),
      alerts: report.stock
        .filter((row) => row.status !== "OK")
        .sort((left, right) => left.currentStock / Math.max(left.minStock, 1) - right.currentStock / Math.max(right.minStock, 1))
        .slice(0, 8),
      recent,
    };
  },

  async stockCsv(days: number) {
    const report = await this.build(days);
    const header = [
      "produto",
      "categoria",
      "fornecedor",
      "estoque",
      "minimo",
      "status",
      `consumo_${days}d`,
      "cobertura_dias",
      "valor_estoque",
      "comprar",
    ];
    const rows = report.stock.map((row) =>
      [
        row.name,
        row.category,
        row.supplier ?? "",
        formatStock(row.currentStock, row.unit, row.packageSize, row.packageLabel),
        formatStock(row.minStock, row.unit, row.packageSize, row.packageLabel),
        row.status,
        formatBase(row.consumed, row.unit),
        row.coverageDays ?? "",
        (row.stockValueCents / 100).toFixed(2).replace(".", ","),
        row.suggestedPackages ? `${row.suggestedPackages} ${row.packageLabel}` : "",
      ]
        .map(csvCell)
        .join(";")
    );
    return "\uFEFF" + [header.join(";"), ...rows].join("\n");
  },
};
