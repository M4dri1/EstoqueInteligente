"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "@/lib/client";
import { formatBase, formatCents } from "@/lib/format";
import { centsToInput, parseDecimal, parseMoneyToCents } from "@/lib/parse";
import { RECIPE_CATEGORIES } from "@/lib/validation";
import { marginOf, UNIT_LABEL, valueCents, type UnitCode } from "@/lib/stock";
import { EmptyRow, Notice, PageHeader, Section } from "./ui";

type Product = {
  id: string;
  name: string;
  unit: UnitCode;
  packageSize: number;
  costCents: number;
};

type Recipe = {
  id: string;
  name: string;
  category: string;
  priceCents: number;
  active: boolean;
  costCents: number;
  marginCents: number;
  marginPct: number;
  available: number;
  items: Array<{ productId: string; quantity: number; product: { name: string; unit: UnitCode } }>;
};

type Line = { productId: string; quantity: string };

function marginTone(pct: number) {
  return pct >= 70 ? "text-kb-ok" : pct >= 55 ? "text-kb-warn" : "text-kb-danger";
}

export function RecipesView() {
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Recipe | "new" | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(RECIPE_CATEGORIES[0]);
  const [price, setPrice] = useState("");
  const [active, setActive] = useState(true);
  const [lines, setLines] = useState<Line[]>([{ productId: "", quantity: "" }]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const load = useCallback(async () => {
    const [recipeData, productData] = await Promise.all([
      api<{ recipes: Recipe[] }>("/api/cardapio?inativos=1"),
      api<{ products: Product[] }>("/api/produtos"),
    ]);
    setRecipes(recipeData.recipes);
    setProducts(productData.products);
  }, []);

  useEffect(() => {
    load().catch((reason) => setMessage({ kind: "error", text: errorMessage(reason) }));
  }, [load]);

  function openForm(recipe: Recipe | "new") {
    setEditing(recipe);
    setMessage(null);
    if (recipe === "new") {
      setName("");
      setCategory(RECIPE_CATEGORIES[0]);
      setPrice("");
      setActive(true);
      setLines([{ productId: "", quantity: "" }]);
    } else {
      setName(recipe.name);
      setCategory(recipe.category);
      setPrice(centsToInput(recipe.priceCents));
      setActive(recipe.active);
      setLines(recipe.items.map((item) => ({ productId: item.productId, quantity: String(item.quantity) })));
    }
  }

  const preview = useMemo(() => {
    let cost = 0;
    for (const line of lines) {
      const product = products.find((item) => item.id === line.productId);
      const quantity = parseDecimal(line.quantity);
      if (product && quantity) {
        cost += valueCents(quantity, product);
      }
    }
    const priceCents = parseMoneyToCents(price) ?? 0;
    return { cost, priceCents, ...marginOf(priceCents, cost) };
  }, [lines, products, price]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const priceCents = parseMoneyToCents(price);
    if (priceCents === null) {
      setMessage({ kind: "error", text: "Informe o preço de venda, por exemplo 18,00." });
      return;
    }
    const items = [];
    for (const line of lines) {
      if (!line.productId) {
        continue;
      }
      const quantity = parseDecimal(line.quantity);
      if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) {
        setMessage({ kind: "error", text: "Cada insumo precisa de uma quantidade inteira maior que zero." });
        return;
      }
      items.push({ productId: line.productId, quantity });
    }
    if (items.length === 0) {
      setMessage({ kind: "error", text: "Adicione pelo menos um insumo." });
      return;
    }

    setSaving(true);
    try {
      const isNew = editing === "new";
      await api(isNew ? "/api/cardapio" : `/api/cardapio/${(editing as Recipe).id}`, {
        method: isNew ? "POST" : "PATCH",
        body: JSON.stringify({ name, category, priceCents, active, items }),
      });
      setEditing(null);
      setMessage({ kind: "success", text: `${name} salvo.` });
      await load();
    } catch (reason) {
      setMessage({ kind: "error", text: errorMessage(reason) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Cardápio"
        actions={
          <button type="button" className="kb-btn" onClick={() => openForm("new")}>
            Novo item
          </button>
        }
      />

      {message && !editing ? (
        <div className="mb-4">
          <Notice kind={message.kind}>{message.text}</Notice>
        </div>
      ) : null}

      {editing ? (
        <form onSubmit={submit} className="kb-card mb-4 space-y-3 p-4">
          <h2 className="font-semibold">{editing === "new" ? "Novo item do cardápio" : `Editar ${editing.name}`}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="kb-label" htmlFor="r-name">Nome no cardápio</label>
              <input id="r-name" className="kb-input" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Brahma 600" />
            </div>
            <div>
              <label className="kb-label" htmlFor="r-category">Categoria</label>
              <select id="r-category" className="kb-input" value={category} onChange={(event) => setCategory(event.target.value)}>
                {RECIPE_CATEGORIES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="kb-label" htmlFor="r-price">Preço de venda (R$)</label>
              <input id="r-price" className="kb-input" inputMode="decimal" required value={price} onChange={(event) => setPrice(event.target.value)} placeholder="12,00" />
            </div>
          </div>

          <div>
            <p className="kb-label">O que sai do estoque a cada unidade vendida</p>
            <div className="space-y-2">
              {lines.map((line, index) => {
                const product = products.find((item) => item.id === line.productId);
                const quantity = parseDecimal(line.quantity);
                return (
                  <div key={index} className="grid grid-cols-[1fr_120px_auto] items-center gap-2 sm:grid-cols-[1fr_140px_120px_auto]">
                    <select
                      className="kb-input"
                      value={line.productId}
                      onChange={(event) => setLines((current) => current.map((item, position) => (position === index ? { ...item, productId: event.target.value } : item)))}
                      aria-label="Insumo"
                    >
                      <option value="">Escolha o produto...</option>
                      {products.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <input
                        className="kb-input"
                        inputMode="numeric"
                        value={line.quantity}
                        onChange={(event) => setLines((current) => current.map((item, position) => (position === index ? { ...item, quantity: event.target.value } : item)))}
                        aria-label="Quantidade"
                      />
                      <span className="w-6 text-xs text-kb-muted">{product ? UNIT_LABEL[product.unit] : ""}</span>
                    </div>
                    <span className="hidden text-sm tabular-nums text-kb-muted sm:block">
                      {product && quantity ? formatCents(valueCents(quantity, product)) : ""}
                    </span>
                    <button
                      type="button"
                      className="kb-btn-danger"
                      onClick={() => setLines((current) => (current.length > 1 ? current.filter((_, position) => position !== index) : current))}
                      aria-label="Remover insumo"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
            <button type="button" className="kb-btn-ghost mt-3" onClick={() => setLines((current) => [...current, { productId: "", quantity: "" }])}>
              Adicionar insumo
            </button>
          </div>

          <div className="flex flex-wrap gap-6 rounded-md bg-kb-raised px-4 py-3 text-sm">
            <span>
              Custo: <strong>{formatCents(preview.cost)}</strong>
            </span>
            <span>
              Margem: <strong className={marginTone(preview.marginPct)}>{formatCents(preview.marginCents)} ({preview.marginPct.toLocaleString("pt-BR")}%)</strong>
            </span>
            <span>
              CMV: <strong>{preview.priceCents ? `${Math.round((preview.cost / preview.priceCents) * 1000) / 10}%`.replace(".", ",") : "—"}</strong>
            </span>
          </div>

          {editing !== "new" ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="h-4 w-4" />
              Disponível para venda
            </label>
          ) : null}

          {message ? <Notice kind={message.kind}>{message.text}</Notice> : null}

          <div className="flex gap-2">
            <button type="submit" className="kb-btn" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button type="button" className="kb-btn-ghost" onClick={() => setEditing(null)}>
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      <Section flush>
        <div className="overflow-x-auto">
          <table className="kb-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Baixa do estoque</th>
                <th>Custo</th>
                <th>Preço</th>
                <th>Margem</th>
                <th>Disponível</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {!recipes ? (
                <EmptyRow colSpan={7}>Carregando...</EmptyRow>
              ) : recipes.length === 0 ? (
                <EmptyRow colSpan={7}>Nenhum item no cardápio.</EmptyRow>
              ) : (
                recipes.map((recipe) => (
                  <tr key={recipe.id} className={recipe.active ? "" : "opacity-50"}>
                    <td>
                      <span className="block font-medium">{recipe.name}</span>
                      <span className="text-xs text-kb-muted">{recipe.category}</span>
                    </td>
                    <td className="text-xs text-kb-muted">
                      {recipe.items.map((item) => `${formatBase(item.quantity, item.product.unit)} ${item.product.name}`).join(" · ")}
                    </td>
                    <td className="whitespace-nowrap tabular-nums">{formatCents(recipe.costCents)}</td>
                    <td className="whitespace-nowrap tabular-nums">{formatCents(recipe.priceCents)}</td>
                    <td className={`whitespace-nowrap tabular-nums font-semibold ${marginTone(recipe.marginPct)}`}>
                      {recipe.marginPct.toLocaleString("pt-BR")}%
                    </td>
                    <td className={`tabular-nums ${recipe.available <= 0 ? "text-kb-danger" : ""}`}>{recipe.available}</td>
                    <td className="text-right">
                      <button type="button" className="text-sm text-kb-info hover:underline" onClick={() => openForm(recipe)}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
