export type UnitCode = "ML" | "G" | "UN";

export type StockProduct = {
  id: string;
  name: string;
  unit: UnitCode;
  packageLabel: string;
  packageSize: number;
  costCents: number;
  minStock: number;
  currentStock: number;
};

export type StockStatus = "ZERADO" | "BAIXO" | "OK";

export type AbcClass = "A" | "B" | "C";

export type AbcRow = {
  productId: string;
  name: string;
  valueCents: number;
  share: number;
  cumulative: number;
  abc: AbcClass;
};

export type Shortage = {
  productId: string;
  name: string;
  needed: number;
  available: number;
};

export const UNIT_LABEL: Record<UnitCode, string> = {
  ML: "ml",
  G: "g",
  UN: "un",
};

export function valueCents(
  quantity: number,
  product: Pick<StockProduct, "costCents" | "packageSize">
) {
  if (product.packageSize <= 0) {
    return 0;
  }
  return Math.round((quantity * product.costCents) / product.packageSize);
}

export function stockStatus(
  product: Pick<StockProduct, "currentStock" | "minStock">
): StockStatus {
  if (product.currentStock <= 0) {
    return "ZERADO";
  }
  if (product.currentStock <= product.minStock) {
    return "BAIXO";
  }
  return "OK";
}

export function targetOf(product: { minStock: number; targetStock?: number | null }) {
  return product.targetStock && product.targetStock > product.minStock
    ? product.targetStock
    : product.minStock * 2;
}

export function suggestedPackages(
  product: Pick<StockProduct, "currentStock" | "minStock" | "packageSize"> & {
    targetStock?: number | null;
  }
) {
  if (product.currentStock > product.minStock || product.packageSize <= 0) {
    return 0;
  }
  const missing = Math.max(targetOf(product) - product.currentStock, product.packageSize);
  return Math.ceil(missing / product.packageSize);
}

export function averageCostCents(
  current: { currentStock: number; costCents: number; packageSize: number },
  entry: { quantity: number; paidCents: number }
) {
  const stock = Math.max(current.currentStock, 0);
  if (stock === 0) {
    return Math.round((entry.paidCents * current.packageSize) / entry.quantity);
  }
  const stockValue = (stock * current.costCents) / current.packageSize;
  return Math.round(((stockValue + entry.paidCents) * current.packageSize) / (stock + entry.quantity));
}

export function variancePct(difference: number | null, sold: number) {
  if (difference === null || sold <= 0) {
    return null;
  }
  return Math.round((difference / sold) * 1000) / 10;
}

export function packagesToBase(packages: number, packageSize: number) {
  return Math.round(packages * packageSize);
}

export function splitPackages(quantity: number, packageSize: number) {
  if (packageSize <= 1) {
    return { packages: quantity, rest: 0 };
  }
  const sign = quantity < 0 ? -1 : 1;
  const abs = Math.abs(quantity);
  return {
    packages: sign * Math.floor(abs / packageSize),
    rest: sign * (abs % packageSize),
  };
}

export function recipeCostCents(
  items: Array<{
    quantity: number;
    product: Pick<StockProduct, "costCents" | "packageSize">;
  }>
) {
  return items.reduce(
    (sum, item) => sum + valueCents(item.quantity, item.product),
    0
  );
}

export function marginOf(priceCents: number, costCents: number) {
  const marginCents = priceCents - costCents;
  const marginPct = priceCents > 0 ? (marginCents / priceCents) * 100 : 0;
  return { marginCents, marginPct: Math.round(marginPct * 10) / 10 };
}

export function findShortages(
  items: Array<{
    quantity: number;
    product: Pick<StockProduct, "id" | "name" | "currentStock">;
  }>,
  times: number
): Shortage[] {
  return items
    .map((item) => ({
      productId: item.product.id,
      name: item.product.name,
      needed: item.quantity * times,
      available: item.product.currentStock,
    }))
    .filter((row) => row.needed > row.available);
}

export function buildAbcCurve(
  rows: Array<{ productId: string; name: string; valueCents: number }>
): AbcRow[] {
  const positive = rows.filter((row) => row.valueCents > 0);
  const total = positive.reduce((sum, row) => sum + row.valueCents, 0);
  if (total === 0) {
    return [];
  }

  let running = 0;
  return [...positive]
    .sort(
      (left, right) =>
        right.valueCents - left.valueCents || left.name.localeCompare(right.name)
    )
    .map((row) => {
      const before = running;
      running += row.valueCents;
      const share = (row.valueCents / total) * 100;
      const cumulative = (running / total) * 100;
      const startPct = (before / total) * 100;
      const abc: AbcClass = startPct < 80 ? "A" : startPct < 95 ? "B" : "C";
      return {
        ...row,
        share: Math.round(share * 10) / 10,
        cumulative: Math.round(cumulative * 10) / 10,
        abc,
      };
    });
}

export function coverageDays(
  currentStock: number,
  consumedInPeriod: number,
  periodDays: number
) {
  if (consumedInPeriod <= 0 || periodDays <= 0) {
    return null;
  }
  if (currentStock <= 0) {
    return 0;
  }
  const perDay = consumedInPeriod / periodDays;
  return Math.floor(currentStock / perDay);
}

export function inventoryDifference(expected: number, counted: number | null) {
  if (counted === null) {
    return null;
  }
  return counted - expected;
}
