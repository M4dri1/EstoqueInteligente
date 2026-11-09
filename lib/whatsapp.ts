export type OrderLine = {
  name: string;
  packages: number;
  packageLabel: string;
};

export function orderText(supplier: string, lines: OrderLine[], barName = "Kassius Bar") {
  const items = lines.map((line) => `- ${line.packages} ${line.packageLabel} de ${line.name}`);
  return [`Olá, ${supplier}! Pedido do ${barName}:`, ...items, "Obrigado!"].join("\n");
}

export function whatsappLink(phone: string | null, text: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  const encoded = encodeURIComponent(text);
  if (digits.length < 10) {
    return `https://wa.me/?text=${encoded}`;
  }
  const number = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${number}?text=${encoded}`;
}
