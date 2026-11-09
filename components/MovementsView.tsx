"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "@/lib/client";
import { formatBase, formatCents, formatDateTime, formatStock } from "@/lib/format";
import { parseDecimal, parseMoneyToCents } from "@/lib/parse";
import { UNIT_LABEL, type UnitCode } from "@/lib/stock";
import { EmptyRow, MovementBadge, Notice, PageHeader, Section } from "./ui";

type Product = {
  id: string;
  name: string;
  unit: UnitCode;
  packageLabel: string;
  packageSize: number;
  costCents: number;
  currentStock: number;
  returnable: boolean;
  emptyStock: number;
};

type Movement = {
  id: string;
  type: string;
  quantity: number;
  costCents: number;
  note: string | null;
  createdAt: string;
  product: { id: string; name: string; unit: UnitCode };
  user: { name: string };
};

type Kind = "ENTRADA" | "PERDA" | "AJUSTE";

export function MovementsView({ isAdmin, initialProductId }: { isAdmin: boolean; initialProductId?: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[] | null>(null);
  const [kind, setKind] = useState<Kind>(isAdmin ? "ENTRADA" : "PERDA");
  const [productId, setProductId] = useState(initialProductId ?? "");
  const [inPackages, setInPackages] = useState(true);
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<1 | -1>(-1);
  const [paid, setPaid] = useState("");
  const [empties, setEmpties] = useState("");
  const [note, setNote] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterProduct, setFilterProduct] = useState(initialProductId ?? "");
  const [days, setDays] = useState(30);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const product = useMemo(() => products.find((item) => item.id === productId), [products, productId]);
  const usesPackages = Boolean(product && product.packageSize > 1);

  const loadProducts = useCallback(async () => {
    const data = await api<{ products: Product[] }>("/api/produtos");
    setProducts(data.products);
  }, []);

  const loadMovements = useCallback(async () => {
    const params = new URLSearchParams({ dias: String(days) });
    if (filterType) params.set("tipo", filterType);
    if (filterProduct) params.set("produto", filterProduct);
    const data = await api<{ movements: Movement[] }>(`/api/movimentacoes?${params}`);
    setMovements(data.movements);
  }, [days, filterType, filterProduct]);

  useEffect(() => {
    loadProducts().catch((reason) => setMessage({ kind: "error", text: errorMessage(reason) }));
  }, [loadProducts]);

  useEffect(() => {
    loadMovements().catch((reason) => setMessage({ kind: "error", text: errorMessage(reason) }));
  }, [loadMovements]);

  const parsedAmount = parseDecimal(amount);
  const baseQuantity =
    product && parsedAmount !== null
      ? Math.round(parsedAmount * (usesPackages && inPackages ? product.packageSize : 1))
      : null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (!product) {
      setMessage({ kind: "error", text: "Escolha o produto." });
      return;
    }
    if (!baseQuantity || baseQuantity <= 0) {
      setMessage({ kind: "error", text: "Informe uma quantidade maior que zero." });
      return;
    }
    let costCents: number | undefined;
    if (kind === "ENTRADA" && paid.trim()) {
      const value = parseMoneyToCents(paid);
      if (value === null) {
        setMessage({ kind: "error", text: "Valor pago inválido. Use por exemplo 239,40." });
        return;
      }
      costCents = value;
    }
    const takesEmpties = kind === "ENTRADA" && product.returnable;
    const emptiesOut = takesEmpties && empties.trim() ? Number(empties) : undefined;
    if (emptiesOut !== undefined && (!Number.isInteger(emptiesOut) || emptiesOut < 0)) {
      setMessage({ kind: "error", text: "Garrafas devolvidas precisa ser um número inteiro." });
      return;
    }

    setSaving(true);
    try {
      const quantity = kind === "AJUSTE" ? baseQuantity * direction : baseQuantity;
      const result = await api<{ currentStock: number }>("/api/movimentacoes", {
        method: "POST",
        body: JSON.stringify({ productId: product.id, type: kind, quantity, costCents, emptiesOut, note: note || null }),
      });
      setMessage({
        kind: "success",
        text: `Registrado. ${product.name} agora tem ${formatStock(result.currentStock, product.unit, product.packageSize, product.packageLabel)}.`,
      });
      setAmount("");
      setPaid("");
      setEmpties("");
      setNote("");
      await Promise.all([loadProducts(), loadMovements()]);
    } catch (reason) {
      setMessage({ kind: "error", text: errorMessage(reason) });
    } finally {
      setSaving(false);
    }
  }

  const kinds: Array<{ value: Kind; label: string; hint: string }> = [
    { value: "ENTRADA", label: "Entrada", hint: "Chegou mercadoria do fornecedor." },
    { value: "PERDA", label: "Perda", hint: "Quebrou, venceu, derramou ou estragou." },
    { value: "AJUSTE", label: "Ajuste", hint: "Corrigir o saldo quando a contagem não bate." },
  ];
  const allowed = kinds.filter((item) => isAdmin || item.value === "PERDA");

  return (
    <>
      <PageHeader title="Entradas e perdas" />

      <Section title="Novo registro">
        <form onSubmit={submit} className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {allowed.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setKind(item.value)}
                className={`rounded-md border px-4 py-2.5 text-left text-sm transition ${
                  kind === item.value ? "border-kb-brand bg-kb-brand-soft text-kb-ink" : "border-kb-line text-kb-muted hover:bg-kb-raised"
                }`}
              >
                <span className="block font-semibold">{item.label}</span>
                <span className="text-xs">{item.hint}</span>
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="md:col-span-2">
              <label className="kb-label" htmlFor="m-product">Produto</label>
              <select id="m-product" className="kb-input" value={productId} onChange={(event) => setProductId(event.target.value)}>
                <option value="">Escolha...</option>
                {products.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — {formatStock(item.currentStock, item.unit, item.packageSize, item.packageLabel)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="kb-label" htmlFor="m-amount">Quantidade</label>
              <div className="flex gap-2">
                {kind === "AJUSTE" ? (
                  <select className="kb-input w-24" value={direction} onChange={(event) => setDirection(Number(event.target.value) as 1 | -1)} aria-label="Sentido do ajuste">
                    <option value={-1}>Tirar</option>
                    <option value={1}>Somar</option>
                  </select>
                ) : null}
                <input id="m-amount" className="kb-input" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" />
                {usesPackages && product ? (
                  <select className="kb-input w-32" value={inPackages ? "pack" : "base"} onChange={(event) => setInPackages(event.target.value === "pack")} aria-label="Unidade">
                    <option value="pack">{product.packageLabel}</option>
                    <option value="base">{UNIT_LABEL[product.unit]}</option>
                  </select>
                ) : product ? (
                  <span className="flex items-center px-2 text-sm text-kb-muted">{UNIT_LABEL[product.unit]}</span>
                ) : null}
              </div>
              {product && baseQuantity ? (
                <p className="mt-1 text-xs text-kb-muted">= {formatBase(baseQuantity, product.unit)}</p>
              ) : null}
            </div>

            {kind === "ENTRADA" ? (
              <div>
                <label className="kb-label" htmlFor="m-paid">Valor pago no total (R$)</label>
                <input id="m-paid" className="kb-input" inputMode="decimal" value={paid} onChange={(event) => setPaid(event.target.value)} placeholder={product && baseQuantity ? formatCents(Math.round((baseQuantity * product.costCents) / product.packageSize)) : "opcional"} />
                <p className="mt-1 text-xs text-kb-muted">Se preencher, o custo vira a média entre o que já tinha e o que chegou.</p>
              </div>
            ) : null}

            {kind === "ENTRADA" && product?.returnable ? (
              <div>
                <label className="kb-label" htmlFor="m-empties">Garrafas vazias devolvidas</label>
                <input id="m-empties" className="kb-input" inputMode="numeric" value={empties} onChange={(event) => setEmpties(event.target.value)} placeholder="0" />
                <p className="mt-1 text-xs text-kb-muted">{`Tem ${product.emptyStock} vazios no depósito.`}</p>
              </div>
            ) : null}

            <div className={kind === "ENTRADA" ? (product?.returnable ? "md:col-span-2 xl:col-span-3" : "md:col-span-2 xl:col-span-4") : ""}>
              <label className="kb-label" htmlFor="m-note">{kind === "PERDA" ? "Motivo (obrigatório)" : "Observação"}</label>
              <input id="m-note" className="kb-input" maxLength={200} value={note} onChange={(event) => setNote(event.target.value)} placeholder={kind === "PERDA" ? "Ex.: garrafa quebrou na reposição" : kind === "ENTRADA" ? "Ex.: NF 1234" : ""} />
            </div>
          </div>

          {message ? <Notice kind={message.kind}>{message.text}</Notice> : null}

          <button type="submit" className="kb-btn" disabled={saving}>
            {saving ? "Registrando..." : `Registrar ${kinds.find((item) => item.value === kind)?.label.toLowerCase()}`}
          </button>
        </form>
      </Section>

      <Section
        title="Histórico"
        flush
        actions={
          <div className="flex flex-wrap gap-2">
            <select className="kb-input w-auto" value={filterType} onChange={(event) => setFilterType(event.target.value)} aria-label="Tipo">
              <option value="">Todos os tipos</option>
              <option value="ENTRADA">Entradas</option>
              <option value="VENDA">Vendas</option>
              <option value="PERDA">Perdas</option>
              <option value="AJUSTE">Ajustes</option>
            </select>
            <select className="kb-input w-auto" value={filterProduct} onChange={(event) => setFilterProduct(event.target.value)} aria-label="Produto">
              <option value="">Todos os produtos</option>
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select className="kb-input w-auto" value={days} onChange={(event) => setDays(Number(event.target.value))} aria-label="Período">
              <option value={1}>Hoje</option>
              <option value={7}>7 dias</option>
              <option value={30}>30 dias</option>
              <option value={90}>90 dias</option>
            </select>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="kb-table">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Tipo</th>
                <th>Produto</th>
                <th>Quantidade</th>
                {isAdmin ? <th>Custo</th> : null}
                <th>Observação</th>
                <th>Por</th>
              </tr>
            </thead>
            <tbody>
              {!movements ? (
                <EmptyRow colSpan={7}>Carregando...</EmptyRow>
              ) : movements.length === 0 ? (
                <EmptyRow colSpan={7}>Nenhuma movimentação no período.</EmptyRow>
              ) : (
                movements.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap text-kb-muted">{formatDateTime(row.createdAt)}</td>
                    <td>
                      <MovementBadge type={row.type} />
                    </td>
                    <td>{row.product.name}</td>
                    <td className={`whitespace-nowrap tabular-nums ${row.quantity < 0 ? "text-kb-danger" : "text-kb-ok"}`}>
                      {row.quantity > 0 ? "+" : ""}
                      {formatBase(row.quantity, row.product.unit)}
                    </td>
                    {isAdmin ? <td className="tabular-nums text-kb-muted">{formatCents(row.costCents)}</td> : null}
                    <td className="text-kb-muted">{row.note ?? "—"}</td>
                    <td className="whitespace-nowrap text-kb-muted">{row.user.name}</td>
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
