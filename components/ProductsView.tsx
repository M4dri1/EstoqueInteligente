"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "@/lib/client";
import { formatCents, formatStock } from "@/lib/format";
import { CATEGORIES } from "@/lib/validation";
import { EmptyRow, Notice, PageHeader, Section, StatusBadge } from "./ui";
import { ProductForm, type EditableProduct } from "./ProductForm";

type Product = EditableProduct & {
  currentStock: number;
  status: string;
  stockValueCents: number;
};

export function ProductsView({ isAdmin }: { isAdmin: boolean }) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<EditableProduct | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (showInactive) {
      params.set("inativos", "1");
    }
    const data = await api<{ products: Product[] }>(`/api/produtos?${params}`);
    setProducts(data.products);
  }, [showInactive]);

  useEffect(() => {
    load().catch((reason) => setError(errorMessage(reason)));
  }, [load]);

  useEffect(() => {
    if (isAdmin) {
      api<{ suppliers: Array<{ id: string; name: string }> }>("/api/fornecedores")
        .then((data) => setSuppliers(data.suppliers))
        .catch(() => setSuppliers([]));
    }
  }, [isAdmin]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (products ?? []).filter(
      (product) =>
        (!term || product.name.toLowerCase().includes(term) || product.barcode === term) &&
        (!category || product.category === category) &&
        (!onlyAlerts || product.status !== "OK")
    );
  }, [products, search, category, onlyAlerts]);

  const totalValue = visible.reduce((sum, product) => sum + product.stockValueCents, 0);

  return (
    <>
      <PageHeader
        title="Estoque"
        actions={
          isAdmin ? (
            <button type="button" className="kb-btn" onClick={() => setEditing("new")}>
              Novo produto
            </button>
          ) : null
        }
      />

      {error ? <Notice kind="error">{error}</Notice> : null}

      {editing ? (
        <ProductForm
          key={editing === "new" ? "new" : editing.id}
          product={editing === "new" ? null : editing}
          suppliers={suppliers}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load().catch((reason) => setError(errorMessage(reason)));
          }}
        />
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_220px_auto_auto]">
        <input type="search" className="kb-input" placeholder="Buscar por nome ou código de barras..." value={search} onChange={(event) => setSearch(event.target.value)} />
        <select className="kb-input" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {CATEGORIES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-kb-muted">
          <input type="checkbox" checked={onlyAlerts} onChange={(event) => setOnlyAlerts(event.target.checked)} className="h-4 w-4 accent-[#c8102e]" />
          Só precisa repor
        </label>
        {isAdmin ? (
          <label className="flex items-center gap-2 text-sm text-kb-muted">
            <input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} className="h-4 w-4 accent-[#c8102e]" />
            Mostrar inativos
          </label>
        ) : null}
      </div>

      <Section flush>
        <div className="overflow-x-auto">
          <table className="kb-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Estoque</th>
                <th>Mínimo</th>
                <th>Status</th>
                {isAdmin ? <th>Valor</th> : null}
                <th />
              </tr>
            </thead>
            <tbody>
              {!products ? (
                <EmptyRow colSpan={7}>Carregando...</EmptyRow>
              ) : visible.length === 0 ? (
                <EmptyRow colSpan={7}>Nenhum produto encontrado.</EmptyRow>
              ) : (
                visible.map((product) => (
                  <tr key={product.id} className={product.active ? "" : "opacity-50"}>
                    <td>
                      <span className="block font-medium">{product.name}</span>
                      <span className="text-xs text-kb-muted">
                        {product.packageSize > 1 ? `${product.packageLabel} de ${product.packageSize} ${product.unit.toLowerCase()}` : "unidade"}
                        {product.supplier ? ` · ${product.supplier.name}` : ""}
                      </span>
                    </td>
                    <td className="text-kb-muted">{product.category}</td>
                    <td className="whitespace-nowrap tabular-nums">{formatStock(product.currentStock, product.unit, product.packageSize, product.packageLabel)}</td>
                    <td className="whitespace-nowrap tabular-nums text-kb-muted">
                      {formatStock(product.minStock, product.unit, product.packageSize, product.packageLabel)}
                      {product.targetStock ? (
                        <span className="block text-xs">ideal {formatStock(product.targetStock, product.unit, product.packageSize, product.packageLabel)}</span>
                      ) : null}
                    </td>
                    <td>
                      <StatusBadge status={product.status} />
                    </td>
                    {isAdmin ? <td className="whitespace-nowrap tabular-nums">{formatCents(product.stockValueCents)}</td> : null}
                    <td className="whitespace-nowrap text-right">
                      {isAdmin ? (
                        <button type="button" className="text-sm text-kb-muted hover:text-kb-ink" onClick={() => setEditing(product)}>
                          Editar
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {isAdmin && products ? (
          <p className="border-t border-kb-line px-3 py-2 text-right text-sm text-kb-muted">
            Valor dos itens listados: <span className="font-semibold text-kb-ink">{formatCents(totalValue)}</span>
          </p>
        ) : null}
      </Section>
    </>
  );
}
