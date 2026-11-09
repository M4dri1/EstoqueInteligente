import { describe, expect, it } from "vitest";
import { orderText, whatsappLink } from "./whatsapp";

describe("orderText", () => {
  it("monta o pedido em uma linha por produto", () => {
    expect(
      orderText("Distribuidora", [
        { name: "Brahma 600 ml", packages: 3, packageLabel: "engradado" },
        { name: "Gelo", packages: 10, packageLabel: "saco" },
      ])
    ).toBe(
      "Olá, Distribuidora! Pedido do Kassius Bar:\n- 3 engradado de Brahma 600 ml\n- 10 saco de Gelo\nObrigado!"
    );
  });
});

describe("whatsappLink", () => {
  it("coloca o 55 em número brasileiro", () => {
    expect(whatsappLink("(11) 98888-7777", "oi")).toBe("https://wa.me/5511988887777?text=oi");
  });

  it("mantém número que já tem código do país", () => {
    expect(whatsappLink("+55 11 98888-7777", "a b")).toBe(
      "https://wa.me/5511988887777?text=a%20b"
    );
  });

  it("abre sem número quando o fornecedor não tem telefone", () => {
    expect(whatsappLink(null, "oi")).toBe("https://wa.me/?text=oi");
  });
});
