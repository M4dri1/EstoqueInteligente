import { splitPackages, UNIT_LABEL, type UnitCode } from "./stock";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCents(cents: number) {
  return currency.format(cents / 100);
}

export function formatBase(quantity: number, unit: UnitCode) {
  if (unit === "ML" && Math.abs(quantity) >= 1000) {
    return `${(quantity / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} L`;
  }
  if (unit === "G" && Math.abs(quantity) >= 1000) {
    return `${(quantity / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`;
  }
  return `${quantity.toLocaleString("pt-BR")} ${UNIT_LABEL[unit]}`;
}

export function formatStock(
  quantity: number,
  unit: UnitCode,
  packageSize: number,
  packageLabel: string
) {
  if (unit === "UN" && packageSize <= 1) {
    return formatBase(quantity, unit);
  }
  const { packages, rest } = splitPackages(quantity, packageSize);
  const label = Math.abs(packages) === 1 ? packageLabel : pluralize(packageLabel);
  if (rest === 0) {
    return `${packages} ${label}`;
  }
  if (packages === 0) {
    return formatBase(rest, unit);
  }
  return `${packages} ${label} + ${formatBase(rest, unit)}`;
}

export function pluralize(word: string) {
  if (/[aeiou]$/i.test(word)) {
    return `${word}s`;
  }
  if (/r$/i.test(word)) {
    return `${word}es`;
  }
  return word;
}

export function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
