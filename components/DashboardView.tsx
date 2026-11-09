"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/client";
import { formatBase, formatCents, formatDateTime, formatStock } from "@/lib/format";
import type { UnitCode } from "@/lib/stock";
import { EmptyRow, MovementBadge, Notice, PageHeader, Section, StatCard, StatusBadge } from "./ui";

type Alert = {
  id: string;
  name: string;
  unit: UnitCode;
  packageLabel: string;
  packageSize: number;
  currentStock: number;
  minStock: number;
  status: string;
  coverageDays: number | null;
  suggestedPackages: number;
};

type Dashboard = {
  summary?: {
    revenueCents: number;
    cmvCents: number;
    cmvPct: number;
    grossMarginCents: number;
    lossCents: number;
    itemsSold: number;
    stockValueCents: number;
    lowStockCount: number;
  };
  daily?: Array<{ date: string; revenueCents: number }>;
  topItems?: Array<{ name: string; quantity: number; revenueCents: number }>;
  alerts: Alert[];
  empties?: { bottles: number; valueCents: number; rows: Array<{ name: string; emptyStock: number }> };
  orders?: { suppliers: number; estimatedCents: number };
  lastCount?: { id: string; status: "ABERTO" | "FECHADO"; createdAt: string; closedAt: string | null; categories: string[] } | null;
  recent: Array<{
    id: string;
    type: string;
    quantity: number;
    createdAt: string;
    note: string | null;
    product: { name: string; unit: UnitCode };
    user: { name: string };
  }>;
};

export function DashboardView({ isAdmin }: { isAdmin: boolean }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Dashboard>("/api/painel")
      .then(setData)
      .catch((reason) => setError(errorMessage(reason)));
  }, []);

  const maxRevenue = Math.max(...(data?.daily ?? []).map((day) => day.revenueCents), 1);

  return (
    <>
      <PageHeader
        title="Painel"
        actions={
          <>
            <Link href="/painel/balcao" className="kb-btn">
              Ir para o balcão
            </Link>
            <Link href="/painel/movimentacoes" className="kb-btn-ghost">
              Entrada ou perda
            </Link>
          </>
        }
      />

      {error ? <Notice kind="error">{error}</Notice> : null}

      {isAdmin && data?.summary ? (
        <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard label="Faturamento (7 dias)" value={formatCents(data.summary.revenueCents)} hint={`${data.summary.itemsSold} itens vendidos`} />
          <StatCard
            label="CMV"
            value={`${data.summary.cmvPct.toLocaleString("pt-BR")}%`}
            hint={`${formatCents(data.summary.cmvCents)} de custo`}
            tone={data.summary.cmvPct > 50 ? "bad" : data.summary.cmvPct > 45 ? "warn" : "default"}
          />
          <StatCard label="Perdas (7 dias)" value={formatCents(data.summary.lossCents)} tone={data.summary.lossCents > 0 ? "warn" : "default"} />
          <StatCard label="Valor em estoque" value={formatCents(data.summary.stockValueCents)} hint={`${data.summary.lowStockCount} itens abaixo do mínimo`} tone={data.summary.lowStockCount > 0 ? "warn" : "default"} />
        </div>
      ) : null}

      {data ? (
        <div className={`mb-4 grid gap-3 ${isAdmin ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          <Link href="/painel/estoque" className="kb-card block border-l-4 border-l-kb-brand px-3 py-2.5 hover:border-kb-brand">
            <p className="text-xs uppercase tracking-wide text-kb-muted">Garrafas vazias</p>
            <p className="text-xl font-semibold tabular-nums">{data.empties?.bottles ?? 0} garrafas</p>
            <p className="truncate text-xs text-kb-muted">
              {(data.empties?.rows ?? []).map((row) => `${row.name.replace("Cerveja ", "")}: ${row.emptyStock}`).join(" · ") || "Nenhuma cerveja retornável"}
            </p>
          </Link>
          {isAdmin ? (
            <Link href="/painel/relatorios" className="kb-card block border-l-4 border-l-kb-ok px-3 py-2.5 hover:border-kb-brand">
              <p className="text-xs uppercase tracking-wide text-kb-muted">Pedidos prontos</p>
              <p className="text-xl font-semibold tabular-nums">
                {data.orders?.suppliers ? `${data.orders.suppliers} fornecedor${data.orders.suppliers > 1 ? "es" : ""}` : "Nada a pedir"}
              </p>
              <p className="text-xs text-kb-muted">
                {data.orders?.suppliers ? `${formatCents(data.orders.estimatedCents)} · mandar no WhatsApp` : "Estoque acima do mínimo"}
              </p>
            </Link>
          ) : null}
          <Link href="/painel/inventario" className="kb-card block border-l-4 border-l-kb-info px-3 py-2.5 hover:border-kb-brand">
            <p className="text-xs uppercase tracking-wide text-kb-muted">Contagem</p>
            <p className="text-xl font-semibold">
              {!data.lastCount ? "Nunca contado" : data.lastCount.status === "ABERTO" ? "Contagem aberta" : `Última: ${formatDateTime(data.lastCount.closedAt ?? data.lastCount.createdAt).split(",")[0]}`}
            </p>
            <p className="text-xs text-kb-muted">
              {data.lastCount?.status === "ABERTO" ? "Continuar contando" : "Fazer contagem rápida de cerveja e destilado"}
            </p>
          </Link>
        </div>
      ) : null}

      <div className={isAdmin ? "grid gap-4 xl:grid-cols-[1.4fr_1fr]" : ""}>
        <Section
          title="Precisa repor"
          flush
          actions={
            isAdmin ? (
              <Link href="/painel/relatorios" className="text-sm text-kb-info hover:underline">
                Lista de compras
              </Link>
            ) : null
          }
        >
          <div className="overflow-x-auto">
            <table className="kb-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Estoque</th>
                  <th>Mínimo</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {!data ? (
                  <EmptyRow colSpan={4}>Carregando...</EmptyRow>
                ) : data.alerts.length === 0 ? (
                  <EmptyRow colSpan={4}>Tudo abastecido.</EmptyRow>
                ) : (
                  data.alerts.map((row) => (
                    <tr key={row.id}>
                      <td className="font-medium">{row.name}</td>
                      <td className="tabular-nums">{formatStock(row.currentStock, row.unit, row.packageSize, row.packageLabel)}</td>
                      <td className="tabular-nums text-kb-muted">{formatStock(row.minStock, row.unit, row.packageSize, row.packageLabel)}</td>
                      <td>
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Section>

        {isAdmin ? (
          <div>
            <Section title="Faturamento por dia">
              {data?.daily?.length ? (
                <div className="flex h-40 items-end gap-2">
                  {data.daily.map((day) => (
                    <div key={day.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                      <div
                        className="w-full bg-kb-brand"
                        style={{ height: `${Math.max((day.revenueCents / maxRevenue) * 100, 4)}%` }}
                        title={formatCents(day.revenueCents)}
                      />
                      <span className="text-[10px] text-kb-muted">{day.date.slice(8)}/{day.date.slice(5, 7)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-kb-muted">{data ? "Sem vendas no período." : "Carregando..."}</p>
              )}
            </Section>

            <Section title="Mais vendidos" flush>
              <ul>
                {(data?.topItems ?? []).map((item, index) => (
                  <li key={item.name} className="flex items-center justify-between border-t border-kb-line px-3 py-2 first:border-t-0">
                    <span>
                      <span className="mr-2 text-kb-muted">{index + 1}.</span>
                      {item.name}
                    </span>
                    <span className="text-sm tabular-nums text-kb-muted">
                      {item.quantity} un · {formatCents(item.revenueCents)}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        ) : null}
      </div>

      <Section title="Últimas movimentações" flush>
        <div className="overflow-x-auto">
          <table className="kb-table">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Tipo</th>
                <th>Produto</th>
                <th>Quantidade</th>
                <th>Por</th>
              </tr>
            </thead>
            <tbody>
              {!data ? (
                <EmptyRow colSpan={5}>Carregando...</EmptyRow>
              ) : data.recent.length === 0 ? (
                <EmptyRow colSpan={5}>Nenhuma movimentação ainda.</EmptyRow>
              ) : (
                data.recent.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap text-kb-muted">{formatDateTime(row.createdAt)}</td>
                    <td>
                      <MovementBadge type={row.type} />
                    </td>
                    <td>{row.product.name}</td>
                    <td className={`tabular-nums ${row.quantity < 0 ? "text-kb-danger" : "text-kb-ok"}`}>
                      {row.quantity > 0 ? "+" : ""}
                      {formatBase(row.quantity, row.product.unit)}
                    </td>
                    <td className="text-kb-muted">{row.user.name}</td>
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
