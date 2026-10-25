export function parseDecimal(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }
  return Number(normalized);
}

export function parseMoneyToCents(value: string): number | null {
  const cleaned = value.replace(/R\$/i, "");
  const parsed = parseDecimal(cleaned);
  if (parsed === null || parsed < 0) {
    return null;
  }
  return Math.round(parsed * 100);
}

export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}
