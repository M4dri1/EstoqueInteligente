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
