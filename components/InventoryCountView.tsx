"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "@/lib/client";
import { formatBase, formatCents, formatDateTime, formatStock } from "@/lib/format";
import { parseDecimal } from "@/lib/parse";
import { UNIT_LABEL, type UnitCode } from "@/lib/stock";
import { Notice, PageHeader, Section, StatCard } from "./ui";

type Row = {
  productId: string;
  counted: number | null;
  reference: number;
  difference: number | null;
  differenceCents: number | null;
  sold: number;
  variancePct: number | null;
  product: {
    name: string;
    category: string;
    unit: UnitCode;
    packageLabel: string;
    packageSize: number;
  };
};

type Inventory = {
  id: string;
  status: "ABERTO" | "FECHADO";
  createdAt: string;
  closedAt: string | null;
  salesSince: string;
  user: { name: string };
  items: Row[];
  summary: { total: number; counted: number; missingCents: number; surplusCents: number };
};

function countDivisor(product: Row["product"]) {
  return product.unit !== "UN" && product.packageSize > 1 ? product.packageSize : 1;
}

function toInput(row: Row) {
  if (row.counted === null) {
    return "";
  }
  return String(Math.round((row.counted / countDivisor(row.product)) * 1000) / 1000).replace(".", ",");
}

export function InventoryCountView({ id, isAdmin }: { id: string; isAdmin: boolean }) {
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const load = useCallback(async () => {
    const data = await api<{ inventory: Inventory }>(`/api/inventarios/${id}`);
    setInventory(data.inventory);
    setValues(Object.fromEntries(data.inventory.items.map((row) => [row.productId, toInput(row)])));
  }, [id]);

  useEffect(() => {
    load().catch((reason) => setMessage({ kind: "error", text: errorMessage(reason) }));
  }, [load]);

  const groups = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const row of inventory?.items ?? []) {
      map.set(row.product.category, [...(map.get(row.product.category) ?? []), row]);
    }
    return Array.from(map.entries());
  }, [inventory]);

  function countedFor(row: Row): number | null | "invalid" {
    const raw = values[row.productId]?.trim() ?? "";
    if (!raw) {
      return null;
    }
    const parsed = parseDecimal(raw);
    if (parsed === null || parsed < 0) {
      return "invalid";
    }
    if (row.product.unit === "UN" && !Number.isInteger(parsed)) {
      return "invalid";
    }
    return Math.round(parsed * countDivisor(row.product));
  }

  async function save() {
    if (!inventory) {
      return false;
    }
    const items = [];
    for (const row of inventory.items) {
      const counted = countedFor(row);
      if (counted === "invalid") {
        setMessage({ kind: "error", text: `Quantidade inválida em ${row.product.name}.` });
        return false;
      }
      items.push({ productId: row.productId, counted });
    }
    await api(`/api/inventarios/${id}`, { method: "PATCH", body: JSON.stringify({ items }) });
    return true;
  }

  async function handleSave() {
    setBusy(true);
    setMessage(null);
    try {
      if (await save()) {
        await load();
        setMessage({ kind: "success", text: "Contagem salva. Pode continuar depois." });
      }
    } catch (reason) {
      setMessage({ kind: "error", text: errorMessage(reason) });
    } finally {
      setBusy(false);
    }
  }

  async function handleClose() {
    if (!window.confirm("Fechar a contagem? O estoque dos itens contados será ajustado para o valor contado.")) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      if (!(await save())) {
        return;
      }
      const result = await api<{ counted: number; adjusted: number }>(`/api/inventarios/${id}`, { method: "POST" });
      await load();
      setMessage({ kind: "success", text: `Contagem fechada: ${result.counted} itens contados, ${result.adjusted} ajustados.` });
    } catch (reason) {
      setMessage({ kind: "error", text: errorMessage(reason) });
    } finally {
      setBusy(false);
    }
  }

  if (!inventory) {
    return (
      <>
        <PageHeader title="Contagem de estoque" />
        {message ? <Notice kind={message.kind}>{message.text}</Notice> : <p className="text-kb-muted">Carregando...</p>}
      </>
    );
  }

  const isOpen = inventory.status === "ABERTO";

  return (
    <>
      <PageHeader
        title={isOpen ? "Contagem em andamento" : "Resultado da contagem"}
        description={`Iniciada em ${formatDateTime(inventory.createdAt)} por ${inventory.user.name}${inventory.closedAt ? ` · fechada em ${formatDateTime(inventory.closedAt)}` : ""}.`}
        actions={
          <>
            <Link href="/painel/inventario" className="kb-btn-ghost">
              Voltar
            </Link>
            {isOpen ? (
              <button type="button" className="kb-btn-ghost" onClick={handleSave} disabled={busy}>
                Salvar contagem
              </button>
            ) : null}
            {isOpen && isAdmin ? (
              <button type="button" className="kb-btn" onClick={handleClose} disabled={busy}>
                Fechar e ajustar estoque
              </button>
            ) : null}
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Contados" value={`${inventory.summary.counted}/${inventory.summary.total}`} />
        <StatCard label="Faltas" value={formatCents(Math.abs(inventory.summary.missingCents))} tone={inventory.summary.missingCents < 0 ? "bad" : "default"} />
        <StatCard label="Sobras" value={formatCents(inventory.summary.surplusCents)} />
        <StatCard
          label="Saldo"
          value={formatCents(inventory.summary.missingCents + inventory.summary.surplusCents)}
          tone={inventory.summary.missingCents + inventory.summary.surplusCents < 0 ? "bad" : "default"}
        />
      </div>

      {message ? (
        <div className="mb-4">
          <Notice kind={message.kind}>{message.text}</Notice>
        </div>
      ) : null}

      {isOpen ? (
        <p className="mb-4 text-sm text-kb-muted">
          Cerveja, refri e lata contam por unidade. Destilado aberto entra em fração: meia garrafa = 0,5. Deixe em branco o que não foi contado. A diferença aparece depois de salvar.
          {isAdmin ? "" : " O administrador fecha a contagem."}
        </p>
      ) : null}

      <p className="mb-4 text-sm text-kb-muted">
        {`Vendido = o que saiu pelo balcão desde ${formatDateTime(inventory.salesSince)}. Diferença acima de 2% das vendas fica em vermelho: vale olhar dose servida, quebra ou desvio.`}
      </p>

      {groups.map(([category, rows]) => (
        <Section key={category} title={category} flush>
          <div className="overflow-x-auto">
            <table className="kb-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>{isOpen ? "Sistema agora" : "Sistema"}</th>
                  <th>Contado</th>
                  <th>Diferença</th>
                  <th>Vendido</th>
                  <th>% das vendas</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const packaged = countDivisor(row.product) > 1;
                  return (
                    <tr key={row.productId}>
                      <td className="font-medium">{row.product.name}</td>
                      <td className="whitespace-nowrap tabular-nums text-kb-muted">
                        {formatStock(row.reference, row.product.unit, row.product.packageSize, row.product.packageLabel)}
                      </td>
                      <td>
                        {isOpen ? (
                          <div className="flex items-center gap-2">
                            <input
                              className="kb-input w-28"
                              inputMode="decimal"
                              value={values[row.productId] ?? ""}
                              onChange={(event) => setValues((current) => ({ ...current, [row.productId]: event.target.value }))}
                              aria-label={`Contado de ${row.product.name}`}
                            />
                            <span className="text-xs text-kb-muted">{packaged ? row.product.packageLabel : UNIT_LABEL[row.product.unit]}</span>
                          </div>
                        ) : row.counted === null ? (
                          <span className="text-kb-muted">não contado</span>
                        ) : (
                          <span className="tabular-nums">{formatStock(row.counted, row.product.unit, row.product.packageSize, row.product.packageLabel)}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap tabular-nums">
                        {row.difference === null ? (
                          <span className="text-kb-muted">—</span>
                        ) : row.difference === 0 ? (
                          <span className="text-kb-ok">Bateu</span>
                        ) : (
                          <span className={row.difference < 0 ? "text-kb-danger" : "text-kb-warn"}>
                            {row.difference > 0 ? "+" : ""}
                            {formatBase(row.difference, row.product.unit)}
                            {row.differenceCents !== null ? ` (${formatCents(row.differenceCents)})` : ""}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap tabular-nums text-kb-muted">
                        {row.sold ? formatBase(row.sold, row.product.unit) : "—"}
                      </td>
                      <td className="whitespace-nowrap tabular-nums">
                        {row.variancePct === null ? (
                          <span className="text-kb-muted">—</span>
                        ) : (
                          <span className={Math.abs(row.variancePct) > 2 ? "font-semibold text-kb-danger" : "text-kb-muted"}>
                            {`${row.variancePct > 0 ? "+" : ""}${row.variancePct.toLocaleString("pt-BR")}%`}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      ))}
    </>
  );
}
