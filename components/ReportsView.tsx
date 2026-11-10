"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/client";
import { formatBase, formatCents, formatDateTime, formatStock } from "@/lib/format";
import type { UnitCode } from "@/lib/stock";
import { EmptyRow, Notice, PageHeader, Section, StatCard, StatusBadge } from "./ui";

type StockRow = {
  id: string;
  name: string;
  category: string;
  unit: UnitCode;
  packageLabel: string;
  packageSize: number;
  costCents: number;
  currentStock: number;
  minStock: number;
  supplier: string | null;
  status: string;
  consumed: number;
  coverageDays: number | null;
  suggestedPackages: number;
  estimatedCents?: number;
};

type Report = {
  days: number;
  summary: {
    revenueCents: number;
    cmvCents: number;
    cmvPct: number;
    grossMarginCents: number;
    lossCents: number;
    itemsSold: number;
    stockValueCents: number;
    lowStockCount: number;
  };
  daily: Array<{ date: string; revenueCents: number; cmvCents: number }>;
  topItems: Array<{ name: string; quantity: number; revenueCents: number; costCents: number }>;
  abc: Array<{ productId: string; name: string; valueCents: number; share: number; cumulative: number; abc: "A" | "B" | "C" }>;
  stock: StockRow[];
  shoppingList: StockRow[];
  supplierOrders: Array<{ supplier: string; phone: string | null; items: number; estimatedCents: number; text: string; link: string }>;
  staffSales: Array<{ name: string; sales: number; items: number; revenueCents: number }>;
  losses: Array<{ id: string; createdAt: string; product: string; quantity: string; type: string; note: string | null; costCents: number }>;
};

const ABC_STYLE = {
  A: "font-semibold text-kb-ink",
  B: "text-kb-ink",
  C: "text-kb-muted",
};

export function ReportsView() {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function copyOrder(supplier: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(supplier);
    } catch {
      setError("Não deu para copiar. Use o botão do WhatsApp.");
    }
  }

  const load = useCallback(async () => {
    setReport(null);
    setReport(await api<Report>(`/api/relatorios?dias=${days}`));
  }, [days]);

  useEffect(() => {
    load().catch((reason) => setError(errorMessage(reason)));
  }, [load]);

  const maxDay = Math.max(...(report?.daily ?? []).map((day) => day.revenueCents), 1);
  const shoppingTotal = (report?.shoppingList ?? []).reduce((sum, row) => sum + (row.estimatedCents ?? 0), 0);
  const rowsOf = (supplier: string) =>
    (report?.shoppingList ?? []).filter((row) => (row.supplier ?? "Sem fornecedor") === supplier);
  const staffTotal = (report?.staffSales ?? []).reduce((sum, row) => sum + row.revenueCents, 0);

  return (
    <>
      <PageHeader
        title="Relatórios"
        actions={
          <>
            <select className="kb-input w-auto" value={days} onChange={(event) => setDays(Number(event.target.value))} aria-label="Período">
              <option value={7}>Últimos 7 dias</option>
              <option value={15}>Últimos 15 dias</option>
              <option value={30}>Últimos 30 dias</option>
              <option value={90}>Últimos 90 dias</option>
            </select>
            <a href={`/api/relatorios?dias=${days}&format=csv`} className="kb-btn-ghost">
              Exportar planilha
            </a>
            <button type="button" className="kb-btn-ghost" onClick={() => window.print()}>
              Imprimir
            </button>
          </>
        }
      />

      {error ? <Notice kind="error">{error}</Notice> : null}

      {!report ? (
        <p className="text-kb-muted">Carregando...</p>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard label="Faturamento" value={formatCents(report.summary.revenueCents)} hint={`${report.summary.itemsSold} itens vendidos`} />
            <StatCard
              label="CMV"
              value={`${report.summary.cmvPct.toLocaleString("pt-BR")}%`}
              hint={`${formatCents(report.summary.cmvCents)} em mercadoria`}
              tone={report.summary.cmvPct > 50 ? "bad" : report.summary.cmvPct > 45 ? "warn" : "default"}
            />
            <StatCard label="Lucro bruto" value={formatCents(report.summary.grossMarginCents)} />
            <StatCard label="Perdas" value={formatCents(report.summary.lossCents)} hint="Quebras, vencidos e diferenças de contagem" tone={report.summary.lossCents > 0 ? "warn" : "default"} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Section title="Faturamento x custo por dia">
              {report.daily.length === 0 ? (
                <p className="text-sm text-kb-muted">Sem vendas no período.</p>
              ) : (
                <>
                  <div className="flex h-48 items-end gap-1">
                    {report.daily.map((day) => (
                      <div key={day.date} className="relative flex h-full flex-1 items-end" title={`${day.date}: ${formatCents(day.revenueCents)} / custo ${formatCents(day.cmvCents)}`}>
                        <div className="w-full bg-kb-info/70" style={{ height: `${(day.revenueCents / maxDay) * 100}%` }} />
                        <div className="absolute bottom-0 w-full bg-kb-cost" style={{ height: `${(day.cmvCents / maxDay) * 100}%` }} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-4 text-xs text-kb-muted">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 bg-kb-info/70" /> Faturamento
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-kb-cost" /> Custo (CMV)
                    </span>
                  </div>
                </>
              )}
            </Section>

            <Section title="Mais vendidos" flush>
              <table className="kb-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qtd.</th>
                    <th>Faturamento</th>
                    <th>Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topItems.length === 0 ? (
                    <EmptyRow colSpan={4}>Sem vendas no período.</EmptyRow>
                  ) : (
                    report.topItems.map((item) => (
                      <tr key={item.name}>
                        <td>{item.name}</td>
                        <td className="tabular-nums">{item.quantity}</td>
                        <td className="tabular-nums">{formatCents(item.revenueCents)}</td>
                        <td className="tabular-nums text-kb-ok">{formatCents(item.revenueCents - item.costCents)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Section>
          </div>

          <Section
            title="Lista de compras"
            description={`estimativa ${formatCents(shoppingTotal)}`}
            flush
          >
            {report.shoppingList.length === 0 ? (
              <p className="px-3 py-4 text-sm text-kb-muted">Nada para comprar agora.</p>
            ) : (
              report.supplierOrders.map((order) => (
                <div key={order.supplier}>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-kb-line bg-kb-raised px-3 py-1.5 first:border-t-0">
                    <p className="text-xs font-semibold text-kb-muted">
                      {order.supplier}
                      <span className="ml-2 font-normal">{`${order.items} ${order.items === 1 ? "item" : "itens"} · ${formatCents(order.estimatedCents)}`}</span>
                    </p>
                    <div className="no-print flex gap-3 text-sm">
                      <button type="button" className="text-kb-muted hover:text-kb-ink" onClick={() => copyOrder(order.supplier, order.text)}>
                        {copied === order.supplier ? "Copiado" : "Copiar pedido"}
                      </button>
                      <a href={order.link} target="_blank" rel="noopener noreferrer" className="font-medium text-kb-ok hover:underline">
                        {order.phone ? "Mandar no WhatsApp" : "Abrir no WhatsApp"}
                      </a>
                    </div>
                  </div>
                  <table className="kb-table">
                    <tbody>
                      {rowsOf(order.supplier).map((row) => (
                        <tr key={row.id}>
                          <td className="font-medium">{row.name}</td>
                          <td className="whitespace-nowrap text-kb-muted">tem {formatStock(row.currentStock, row.unit, row.packageSize, row.packageLabel)}</td>
                          <td className="whitespace-nowrap font-semibold">
                            comprar {row.suggestedPackages} {row.packageLabel}
                          </td>
                          <td className="whitespace-nowrap text-right tabular-nums text-kb-muted">{formatCents(row.estimatedCents ?? 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </Section>

          <Section title="Vendas por funcionário" flush>
            <table className="kb-table">
              <thead>
                <tr>
                  <th>Funcionário</th>
                  <th>Lançamentos</th>
                  <th>Itens</th>
                  <th>Faturamento</th>
                  <th>Parte</th>
                </tr>
              </thead>
              <tbody>
                {report.staffSales.length === 0 ? (
                  <EmptyRow colSpan={5}>Sem vendas no período.</EmptyRow>
                ) : (
                  report.staffSales.map((row) => (
                    <tr key={row.name}>
                      <td className="font-medium">{row.name}</td>
                      <td className="tabular-nums">{row.sales}</td>
                      <td className="tabular-nums">{row.items}</td>
                      <td className="tabular-nums">{formatCents(row.revenueCents)}</td>
                      <td className="tabular-nums text-kb-muted">
                        {staffTotal ? `${Math.round((row.revenueCents / staffTotal) * 100)}%` : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Section>

          <Section
            title="Curva ABC do consumo"
            flush
          >
            <div className="overflow-x-auto">
              <table className="kb-table">
                <thead>
                  <tr>
                    <th>Classe</th>
                    <th>Produto</th>
                    <th>Custo consumido</th>
                    <th>Participação</th>
                    <th>Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {report.abc.length === 0 ? (
                    <EmptyRow colSpan={5}>Sem consumo no período.</EmptyRow>
                  ) : (
                    report.abc.map((row) => (
                      <tr key={row.productId}>
                        <td>
                          <span className={`inline-flex h-7 w-7 items-center justify-center rounded text-sm font-semibold ${ABC_STYLE[row.abc]}`}>{row.abc}</span>
                        </td>
                        <td>{row.name}</td>
                        <td className="tabular-nums">{formatCents(row.valueCents)}</td>
                        <td className="tabular-nums">{row.share.toLocaleString("pt-BR")}%</td>
                        <td className="tabular-nums text-kb-muted">{row.cumulative.toLocaleString("pt-BR")}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Cobertura do estoque (dias)" flush>
            <div className="overflow-x-auto">
              <table className="kb-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Estoque</th>
                    <th>Consumo no período</th>
                    <th>Dura</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...report.stock]
                    .sort((left, right) => (left.coverageDays ?? 9999) - (right.coverageDays ?? 9999))
                    .map((row) => (
                      <tr key={row.id}>
                        <td>{row.name}</td>
                        <td className="whitespace-nowrap tabular-nums">{formatStock(row.currentStock, row.unit, row.packageSize, row.packageLabel)}</td>
                        <td className="whitespace-nowrap tabular-nums text-kb-muted">{formatBase(row.consumed, row.unit)}</td>
                        <td className={`whitespace-nowrap tabular-nums ${row.coverageDays !== null && row.coverageDays < 7 ? "text-kb-danger" : ""}`}>
                          {row.coverageDays === null ? "sem consumo" : `${row.coverageDays} dias`}
                        </td>
                        <td>
                          <StatusBadge status={row.status} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Perdas e diferenças" flush>
            <div className="overflow-x-auto">
              <table className="kb-table">
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>Produto</th>
                    <th>Quantidade</th>
                    <th>Motivo</th>
                    <th>Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {report.losses.length === 0 ? (
                    <EmptyRow colSpan={5}>Nenhuma perda registrada no período.</EmptyRow>
                  ) : (
                    report.losses.map((row) => (
                      <tr key={row.id}>
                        <td className="whitespace-nowrap text-kb-muted">{formatDateTime(row.createdAt)}</td>
                        <td>{row.product}</td>
                        <td className="whitespace-nowrap tabular-nums text-kb-danger">−{row.quantity}</td>
                        <td className="text-kb-muted">{row.note ?? (row.type === "AJUSTE" ? "Ajuste" : "—")}</td>
                        <td className="tabular-nums">{formatCents(row.costCents)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
    </>
  );
}
