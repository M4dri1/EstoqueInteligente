import { describe, expect, it } from "vitest";
import {
  averageCostCents,
  buildAbcCurve,
  coverageDays,
  findShortages,
  inventoryDifference,
  marginOf,
  packagesToBase,
  recipeCostCents,
  splitPackages,
  stockStatus,
  suggestedPackages,
  valueCents,
  variancePct,
} from "./stock";
import { formatCents, formatStock } from "./format";

const vodka = {
  id: "vodka",
  name: "Vodka Smirnoff 998 ml",
  unit: "ML" as const,
  packageLabel: "garrafa",
  packageSize: 1000,
  costCents: 3990,
  minStock: 2000,
  currentStock: 3500,
};

const limao = {
  id: "limao",
  name: "Limão",
  unit: "UN" as const,
  packageLabel: "un",
  packageSize: 1,
  costCents: 50,
  minStock: 30,
  currentStock: 12,
};

describe("valueCents", () => {
  it("calcula o custo proporcional de uma dose", () => {
    expect(valueCents(50, vodka)).toBe(200);
  });

  it("retorna zero quando a embalagem é inválida", () => {
    expect(valueCents(50, { costCents: 1000, packageSize: 0 })).toBe(0);
  });
});

describe("stockStatus", () => {
  it("classifica zerado, baixo e ok", () => {
    expect(stockStatus({ currentStock: 0, minStock: 10 })).toBe("ZERADO");
    expect(stockStatus({ currentStock: -5, minStock: 10 })).toBe("ZERADO");
    expect(stockStatus({ currentStock: 10, minStock: 10 })).toBe("BAIXO");
    expect(stockStatus({ currentStock: 11, minStock: 10 })).toBe("OK");
  });
});

describe("suggestedPackages", () => {
  it("não sugere compra quando o estoque está acima do mínimo", () => {
    expect(suggestedPackages(vodka)).toBe(0);
  });

  it("sugere repor até o dobro do mínimo", () => {
    expect(suggestedPackages(limao)).toBe(48);
    expect(
      suggestedPackages({ currentStock: 500, minStock: 2000, packageSize: 1000 })
    ).toBe(4);
  });

  it("sugere ao menos uma embalagem", () => {
    expect(
      suggestedPackages({ currentStock: 0, minStock: 0, packageSize: 1000 })
    ).toBe(1);
  });

  it("completa até o estoque ideal quando ele existe", () => {
    expect(
      suggestedPackages({ currentStock: 40, minStock: 48, targetStock: 192, packageSize: 24 })
    ).toBe(7);
    expect(
      suggestedPackages({ currentStock: 40, minStock: 48, targetStock: 30, packageSize: 24 })
    ).toBe(3);
  });
});

describe("averageCostCents", () => {
  it("faz a média ponderada entre o que tinha e o que chegou", () => {
    expect(
      averageCostCents(
        { currentStock: 24, costCents: 15600, packageSize: 24 },
        { quantity: 24, paidCents: 16800 }
      )
    ).toBe(16200);
  });

  it("usa o preço da compra quando o estoque estava zerado", () => {
    expect(
      averageCostCents(
        { currentStock: 0, costCents: 1000, packageSize: 965 },
        { quantity: 1930, paidCents: 3600 }
      )
    ).toBe(1800);
  });
});

describe("variancePct", () => {
  it("mostra a diferença como porcentagem do que foi vendido", () => {
    expect(variancePct(-12, 240)).toBe(-5);
    expect(variancePct(0, 240)).toBe(0);
    expect(variancePct(-3, 0)).toBeNull();
    expect(variancePct(null, 10)).toBeNull();
  });
});

describe("conversão de embalagens", () => {
  it("converte embalagens para unidade base", () => {
    expect(packagesToBase(2.5, 1000)).toBe(2500);
  });

  it("separa garrafas fechadas e sobra", () => {
    expect(splitPackages(3500, 1000)).toEqual({ packages: 3, rest: 500 });
    expect(splitPackages(-1500, 1000)).toEqual({ packages: -1, rest: -500 });
    expect(splitPackages(7, 1)).toEqual({ packages: 7, rest: 0 });
  });

  it("formata o estoque de forma legível", () => {
    expect(formatStock(3500, "ML", 1000, "garrafa")).toBe("3 garrafas + 500 ml");
    expect(formatStock(1000, "ML", 1000, "garrafa")).toBe("1 garrafa");
    expect(formatStock(300, "ML", 1000, "garrafa")).toBe("300 ml");
    expect(formatStock(12, "UN", 1, "un")).toBe("12 un");
  });
});

describe("ficha técnica", () => {
  it("soma o custo dos insumos e calcula a margem", () => {
    const cost = recipeCostCents([
      { quantity: 50, product: vodka },
      { quantity: 1, product: limao },
    ]);
    expect(cost).toBe(250);
    expect(marginOf(1800, cost)).toEqual({ marginCents: 1550, marginPct: 86.1 });
  });

  it("margem de preço zero não divide por zero", () => {
    expect(marginOf(0, 100)).toEqual({ marginCents: -100, marginPct: 0 });
  });

  it("aponta insumos insuficientes para a venda", () => {
    const shortages = findShortages(
      [
        { quantity: 50, product: vodka },
        { quantity: 2, product: limao },
      ],
      7
    );
    expect(shortages).toEqual([
      { productId: "limao", name: "Limão", needed: 14, available: 12 },
    ]);
  });
});

describe("buildAbcCurve", () => {
  it("classifica A até 80%, B até 95% e C no restante", () => {
    const curve = buildAbcCurve([
      { productId: "a", name: "Cerveja", valueCents: 7000 },
      { productId: "b", name: "Vodka", valueCents: 1500 },
      { productId: "c", name: "Gelo", valueCents: 1000 },
      { productId: "d", name: "Limão", valueCents: 500 },
      { productId: "e", name: "Parado", valueCents: 0 },
    ]);
    expect(curve.map((row) => [row.productId, row.abc, row.cumulative])).toEqual([
      ["a", "A", 70],
      ["b", "A", 85],
      ["c", "B", 95],
      ["d", "C", 100],
    ]);
  });

  it("retorna vazio sem consumo", () => {
    expect(buildAbcCurve([{ productId: "x", name: "X", valueCents: 0 }])).toEqual([]);
  });
});

describe("coverageDays", () => {
  it("estima quantos dias o estoque dura", () => {
    expect(coverageDays(3000, 6000, 30)).toBe(15);
  });

  it("retorna null sem consumo e zero sem estoque", () => {
    expect(coverageDays(3000, 0, 30)).toBeNull();
    expect(coverageDays(0, 100, 30)).toBe(0);
  });
});

describe("inventoryDifference", () => {
  it("calcula sobra e falta da contagem", () => {
    expect(inventoryDifference(1000, 850)).toBe(-150);
    expect(inventoryDifference(10, 12)).toBe(2);
    expect(inventoryDifference(10, null)).toBeNull();
  });
});

describe("formatCents", () => {
  it("formata em reais", () => {
    expect(formatCents(123456).replace(/\s/g, " ")).toBe("R$ 1.234,56");
  });
});
