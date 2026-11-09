import { describe, expect, it } from "vitest";
import { centsToInput, parseDecimal, parseMoneyToCents } from "./parse";

describe("parseDecimal", () => {
  it("aceita vírgula e ponto como decimal", () => {
    expect(parseDecimal("3,5")).toBe(3.5);
    expect(parseDecimal("3.5")).toBe(3.5);
    expect(parseDecimal(" 12 ")).toBe(12);
    expect(parseDecimal("-2")).toBe(-2);
  });

  it("entende separador de milhar", () => {
    expect(parseDecimal("1.250,75")).toBe(1250.75);
    expect(parseDecimal("30.000")).toBe(30000);
  });

  it("rejeita texto inválido", () => {
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("abc")).toBeNull();
    expect(parseDecimal("1,2,3")).toBeNull();
  });
});

describe("parseMoneyToCents", () => {
  it("converte reais para centavos", () => {
    expect(parseMoneyToCents("39,90")).toBe(3990);
    expect(parseMoneyToCents("R$ 1.234,56")).toBe(123456);
    expect(parseMoneyToCents("7")).toBe(700);
  });

  it("rejeita valores negativos ou inválidos", () => {
    expect(parseMoneyToCents("-1")).toBeNull();
    expect(parseMoneyToCents("dez")).toBeNull();
  });

  it("volta centavos para o campo do formulário", () => {
    expect(centsToInput(3990)).toBe("39,90");
  });
});
