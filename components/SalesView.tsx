"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "@/lib/client";
import { formatCents, formatDateTime } from "@/lib/format";
import { RECIPE_CATEGORIES } from "@/lib/validation";
import { EmptyRow, Notice, PageHeader, Section } from "./ui";

type Recipe = {
  id: string;
  name: string;
  category: string;
  priceCents: number;
  available: number;
};

type CartLine = { recipe: Recipe; quantity: number };

const CATEGORY_COLOR: Record<string, string> = {
  Cervejas: "border-l-[#c8102e]",
  Doses: "border-l-[#b07a4a]",
  Caipirinhas: "border-l-[#5a9e3a]",
  Porções: "border-l-[#d0682a]",
  Espetinhos: "border-l-[#8a5a3a]",
  "Refri e água": "border-l-[#2f7fb0]",
};

type Sale = {
  id: string;
  quantity: number;
  priceCents: number;
  createdAt: string;
  recipe: { name: string };
  user: { name: string };
};

export function SalesView() {
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const load = useCallback(async () => {
    const [recipeData, saleData] = await Promise.all([
      api<{ recipes: Recipe[] }>("/api/cardapio"),
      api<{ sales: Sale[] }>("/api/vendas"),
    ]);
    setRecipes(recipeData.recipes);
    setSales(saleData.sales);
  }, []);

  useEffect(() => {
    load().catch((reason) => setMessage({ kind: "error", text: errorMessage(reason) }));
  }, [load]);

  const groups = useMemo(() => {
    const term = search.trim().toLowerCase();
    const map = new Map<string, Recipe[]>();
    for (const recipe of recipes ?? []) {
      if (term && !recipe.name.toLowerCase().includes(term)) {
        continue;
      }
      map.set(recipe.category, [...(map.get(recipe.category) ?? []), recipe]);
    }
    const order = (category: string) => {
      const index = RECIPE_CATEGORIES.indexOf(category as (typeof RECIPE_CATEGORIES)[number]);
      return index === -1 ? RECIPE_CATEGORIES.length : index;
    };
    return Array.from(map.entries()).sort(([left], [right]) => order(left) - order(right));
  }, [recipes, search]);

  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cart.reduce((sum, line) => sum + line.quantity * line.recipe.priceCents, 0);
  const inCart = (id: string) => cart.find((line) => line.recipe.id === id)?.quantity ?? 0;

  function add(recipe: Recipe) {
    setMessage(null);
    setCart((current) =>
      current.some((line) => line.recipe.id === recipe.id)
        ? current.map((line) =>
            line.recipe.id === recipe.id ? { ...line, quantity: Math.min(line.quantity + 1, 200) } : line
          )
        : [...current, { recipe, quantity: 1 }]
    );
  }

  function change(id: string, delta: number) {
    setCart((current) =>
      current
        .map((line) => (line.recipe.id === id ? { ...line, quantity: Math.min(line.quantity + delta, 200) } : line))
        .filter((line) => line.quantity > 0)
    );
  }

  async function launch() {
    if (cart.length === 0) {
      return;
    }
    setSaving(true);
    setMessage(null);
    const failed: CartLine[] = [];
    const errors: string[] = [];
    let launched = 0;
    for (const line of cart) {
      try {
        await api("/api/vendas", {
          method: "POST",
          body: JSON.stringify({ recipeId: line.recipe.id, quantity: line.quantity }),
        });
        launched += line.quantity;
      } catch (reason) {
        failed.push(line);
        errors.push(`${line.recipe.name}: ${errorMessage(reason)}`);
      }
    }
    setCart(failed);
    setMessage(
      errors.length
        ? { kind: "error", text: `${launched ? `${launched} itens lançados. ` : ""}Não lançou ${errors.join(" ")}` }
        : { kind: "success", text: `Pedido lançado: ${launched} ${launched === 1 ? "item" : "itens"}.` }
    );
    await load().catch(() => undefined);
    setSaving(false);
  }

  return (
    <>
      <PageHeader title="Balcão" />

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div>
          <input
            type="search"
            placeholder="Buscar item..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="kb-input mb-4 max-w-xs"
          />

          {!recipes ? (
            <p className="text-kb-muted">Carregando...</p>
          ) : groups.length === 0 ? (
            <p className="text-kb-muted">Nenhum item encontrado.</p>
          ) : (
            groups.map(([category, items]) => (
              <div key={category} className="mb-4">
                <h2 className="mb-2 text-sm font-semibold text-kb-muted">{category}</h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-4">
                  {items.map((recipe) => {
                    const count = inCart(recipe.id);
                    const out = recipe.available <= 0;
                    return (
                      <button
                        key={recipe.id}
                        type="button"
                        onClick={() => add(recipe)}
                        disabled={out}
                        className={`relative min-h-[64px] rounded-md border border-l-4 px-3 py-2 text-left ${
                          CATEGORY_COLOR[recipe.category] ?? "border-l-kb-line"
                        } ${
                          count
                            ? "border-kb-brand bg-kb-brand-soft"
                            : "border-kb-line bg-kb-panel hover:bg-kb-raised"
                        } ${out ? "cursor-not-allowed opacity-50" : ""}`}
                      >
                        {count ? (
                          <span className="absolute right-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-kb-brand px-1.5 text-xs font-bold text-white">
                            {count}
                          </span>
                        ) : null}
                        <span className="block pr-6 font-semibold">{recipe.name}</span>
                        <span className="flex justify-between text-xs">
                          <span>{formatCents(recipe.priceCents)}</span>
                          <span className={out ? "text-kb-danger" : recipe.available <= 5 ? "text-kb-warn" : "text-kb-muted"}>
                            {out ? "sem estoque" : `${recipe.available} disp.`}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="xl:sticky xl:top-4 xl:self-start">
          <Section
            title="Pedido"
            actions={
              cart.length ? (
                <button type="button" className="text-sm text-kb-muted hover:text-kb-ink" onClick={() => setCart([])}>
                  Limpar
                </button>
              ) : null
            }
          >
            {cart.length === 0 ? (
              <p className="text-sm text-kb-muted">Toque nos itens para montar o pedido. Tocar de novo soma mais um.</p>
            ) : (
              <div className="space-y-2">
                {cart.map((line) => (
                  <div key={line.recipe.id} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{line.recipe.name}</p>
                      <p className="text-xs text-kb-muted">{formatCents(line.recipe.priceCents * line.quantity)}</p>
                    </div>
                    <button type="button" className="kb-btn-ghost h-8 w-8 px-0" onClick={() => change(line.recipe.id, -1)} aria-label={`Tirar um ${line.recipe.name}`}>
                      −
                    </button>
                    <span className="w-6 text-center font-semibold tabular-nums">{line.quantity}</span>
                    <button type="button" className="kb-btn-ghost h-8 w-8 px-0" onClick={() => change(line.recipe.id, 1)} aria-label={`Mais um ${line.recipe.name}`}>
                      +
                    </button>
                  </div>
                ))}
                <p className="flex justify-between border-t border-kb-line pt-2 text-sm">
                  <span className="text-kb-muted">{cartCount} {cartCount === 1 ? "item" : "itens"}</span>
                  <span className="font-semibold">{formatCents(cartTotal)}</span>
                </p>
                <button type="button" className="kb-btn w-full" onClick={launch} disabled={saving}>
                  {saving ? "Lançando..." : "Lançar pedido"}
                </button>
              </div>
            )}
            {message ? (
              <div className="mt-3">
                <Notice kind={message.kind}>{message.text}</Notice>
              </div>
            ) : null}
          </Section>

          <Section title="Últimas vendas" flush>
            <table className="kb-table">
              <tbody>
                {sales.length === 0 ? (
                  <EmptyRow colSpan={2}>Nenhuma venda registrada.</EmptyRow>
                ) : (
                  sales.slice(0, 12).map((sale) => (
                    <tr key={sale.id}>
                      <td>
                        <span className="block">
                          {sale.quantity}× {sale.recipe.name}
                        </span>
                        <span className="text-xs text-kb-muted">
                          {formatDateTime(sale.createdAt)} · {sale.user.name}
                        </span>
                      </td>
                      <td className="text-right tabular-nums">{formatCents(sale.priceCents)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Section>
        </div>
      </div>
    </>
  );
}
