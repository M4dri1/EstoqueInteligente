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
  canceledAt: string | null;
  recipe: { name: string };
  user: { name: string };
  canceledBy: { name: string } | null;
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

  async function cancelSale(sale: Sale) {
    if (!window.confirm(`Cancelar ${sale.quantity}× ${sale.recipe.name}? O estoque volta.`)) {
      return;
    }
    setMessage(null);
    try {
      await api(`/api/vendas/${sale.id}`, { method: "DELETE" });
      setMessage({ kind: "success", text: `Venda de ${sale.recipe.name} cancelada. O estoque voltou.` });
      await load();
    } catch (reason) {
      setMessage({ kind: "error", text: errorMessage(reason) });
    }
  }

  return (
    <div className="pb-20 xl:pb-0">
      <PageHeader title="Balcão" />

      {message ? (
        <div className="sticky top-0 z-10 mb-3 xl:hidden">
          <Notice kind={message.kind}>{message.text}</Notice>
        </div>
      ) : null}

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
                      <div key={recipe.id} className="relative">
                        <button
                          type="button"
                          onClick={() => add(recipe)}
                          disabled={out}
                          className={`min-h-[64px] w-full rounded-md border border-l-4 px-3 py-2 text-left ${
                            CATEGORY_COLOR[recipe.category] ?? "border-l-kb-line"
                          } ${
                            count
                              ? "border-kb-brand bg-kb-brand-soft"
                              : "border-kb-line bg-kb-panel hover:bg-kb-raised"
                          } ${out ? "cursor-not-allowed opacity-50" : ""}`}
                        >
                          {count ? (
                            <span className="absolute right-1.5 top-1.5 flex h-7 min-w-7 items-center justify-center rounded-full bg-kb-brand px-1.5 text-sm font-bold text-white">
                              {count}
                            </span>
                          ) : null}
                          <span className={`block font-semibold ${count ? "pr-16" : ""}`}>{recipe.name}</span>
                          <span className="flex justify-between text-xs">
                            <span>{formatCents(recipe.priceCents)}</span>
                            <span className={out ? "text-kb-danger" : recipe.available <= 5 ? "text-kb-warn" : "text-kb-muted"}>
                              {out ? "sem estoque" : `${recipe.available} disp.`}
                            </span>
                          </span>
                        </button>
                        {count ? (
                          <button
                            type="button"
                            onClick={() => change(recipe.id, -1)}
                            aria-label={`Tirar um ${recipe.name}`}
                            title="Tirar um"
                            className="absolute right-10 top-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-kb-brand bg-kb-panel text-lg font-bold leading-none text-kb-brand hover:bg-kb-hover"
                          >
                            −
                          </button>
                        ) : null}
                      </div>
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
                <button type="button" className="kb-btn hidden w-full xl:inline-flex" onClick={launch} disabled={saving}>
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
                  <EmptyRow colSpan={3}>Nenhuma venda registrada.</EmptyRow>
                ) : (
                  sales.slice(0, 12).map((sale) => (
                    <tr key={sale.id} className={sale.canceledAt ? "text-kb-muted" : ""}>
                      <td>
                        <span className={`block ${sale.canceledAt ? "line-through" : ""}`}>
                          {sale.quantity}× {sale.recipe.name}
                        </span>
                        <span className="text-xs text-kb-muted">
                          {sale.canceledAt
                            ? `cancelada por ${sale.canceledBy?.name ?? "—"}`
                            : `${formatDateTime(sale.createdAt)} · ${sale.user.name}`}
                        </span>
                      </td>
                      <td className={`text-right tabular-nums ${sale.canceledAt ? "line-through" : ""}`}>
                        {formatCents(sale.priceCents)}
                      </td>
                      <td className="w-16 text-right">
                        {sale.canceledAt ? null : (
                          <button type="button" className="text-xs text-kb-danger hover:underline" onClick={() => cancelSale(sale)}>
                            Cancelar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Section>
        </div>
      </div>

      {cart.length ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-kb-line bg-kb-panel px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.15)] xl:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-kb-muted">{cartCount} {cartCount === 1 ? "item" : "itens"} no pedido</p>
              <p className="text-lg font-semibold tabular-nums">{formatCents(cartTotal)}</p>
            </div>
            <button type="button" className="kb-btn px-6 py-2.5 text-base" onClick={launch} disabled={saving}>
              {saving ? "Lançando..." : "Lançar pedido"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
