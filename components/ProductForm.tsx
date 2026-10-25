"use client";

import { FormEvent, useState } from "react";
import { api, errorMessage } from "@/lib/client";
import { centsToInput, parseDecimal, parseMoneyToCents } from "@/lib/parse";
import { CATEGORIES } from "@/lib/validation";
import { UNIT_LABEL, type UnitCode } from "@/lib/stock";
import { Notice } from "./ui";

export type EditableProduct = {
  id: string;
  name: string;
  category: string;
  unit: UnitCode;
  packageLabel: string;
  packageSize: number;
  costCents: number;
  minStock: number;
  targetStock: number | null;
  returnable: boolean;
  depositCents: number;
  barcode: string | null;
  active: boolean;
  supplier: { id: string; name: string } | null;
};

type Props = {
  product: EditableProduct | null;
  suppliers: Array<{ id: string; name: string }>;
  onSaved: () => void;
  onCancel: () => void;
};

export function ProductForm({ product, suppliers, onSaved, onCancel }: Props) {
  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? CATEGORIES[0]);
  const [unit, setUnit] = useState<UnitCode>(product?.unit ?? "UN");
  const [packageLabel, setPackageLabel] = useState(product?.packageLabel ?? "un");
  const [packageSize, setPackageSize] = useState(String(product?.packageSize ?? 1));
  const [cost, setCost] = useState(product ? centsToInput(product.costCents) : "");
  const [minPackages, setMinPackages] = useState(
    product ? String(product.minStock / product.packageSize).replace(".", ",") : ""
  );
  const [targetPackages, setTargetPackages] = useState(
    product?.targetStock ? String(product.targetStock / product.packageSize).replace(".", ",") : ""
  );
  const [returnable, setReturnable] = useState(product?.returnable ?? false);
  const [deposit, setDeposit] = useState(
    product?.depositCents ? centsToInput(product.depositCents) : ""
  );
  const [barcode, setBarcode] = useState(product?.barcode ?? "");
  const [supplierId, setSupplierId] = useState(product?.supplier?.id ?? "");
  const [active, setActive] = useState(product?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const size = parseDecimal(packageSize);
  const unitLabel = UNIT_LABEL[unit];

  function changeUnit(next: UnitCode) {
    setUnit(next);
    if (next === "UN") {
      setPackageLabel("un");
      setPackageSize("1");
    } else if (packageLabel === "un") {
      setPackageLabel(next === "ML" ? "garrafa" : "pacote");
      setPackageSize(next === "ML" ? "1000" : "1000");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const costCents = parseMoneyToCents(cost);
    const min = parseDecimal(minPackages || "0");
    if (!size || size < 1 || !Number.isInteger(size)) {
      setError(`Informe quantos ${unitLabel} vem em cada ${packageLabel}, em número inteiro.`);
      return;
    }
    if (costCents === null) {
      setError("Informe o custo da embalagem, por exemplo 39,90.");
      return;
    }
    if (min === null || min < 0) {
      setError("Informe o estoque mínimo.");
      return;
    }
    const target = targetPackages ? parseDecimal(targetPackages) : null;
    if (target !== null && target <= min) {
      setError("O estoque ideal precisa ser maior que o mínimo.");
      return;
    }
    const isReturnable = unit === "UN" && returnable;
    const depositCents = isReturnable && deposit ? parseMoneyToCents(deposit) : 0;
    if (depositCents === null) {
      setError("Informe o valor da garrafa vazia, por exemplo 1,50.");
      return;
    }

    setSaving(true);
    try {
      await api(product ? `/api/produtos/${product.id}` : "/api/produtos", {
        method: product ? "PATCH" : "POST",
        body: JSON.stringify({
          name,
          category,
          unit,
          packageLabel,
          packageSize: size,
          costCents,
          minStock: Math.round(min * size),
          targetStock: target === null ? null : Math.round(target * size),
          returnable: isReturnable,
          depositCents,
          barcode: barcode || null,
          supplierId: supplierId || null,
          active,
        }),
      });
      onSaved();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="kb-card mb-4 space-y-3 p-4">
      <h2 className="font-semibold">{product ? `Editar ${product.name}` : "Novo produto"}</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="kb-label" htmlFor="p-name">Nome</label>
          <input id="p-name" className="kb-input" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Vodka Smirnoff" />
        </div>
        <div>
          <label className="kb-label" htmlFor="p-category">Categoria</label>
          <select id="p-category" className="kb-input" value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>
            {CATEGORIES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="kb-label" htmlFor="p-unit">Controlar em</label>
          <select id="p-unit" className="kb-input" value={unit} onChange={(event) => changeUnit(event.target.value as UnitCode)}>
            <option value="UN">Unidades (lata, long neck, limão)</option>
            <option value="ML">Mililitros (destilados, chopp)</option>
            <option value="G">Gramas (gelo, açúcar, porções)</option>
          </select>
        </div>
        <div>
          <label className="kb-label" htmlFor="p-pack">Embalagem de compra</label>
          <input id="p-pack" className="kb-input" required maxLength={20} value={packageLabel} onChange={(event) => setPackageLabel(event.target.value)} placeholder="garrafa, barril, saco..." />
        </div>
        <div>
          <label className="kb-label" htmlFor="p-size">{`${unitLabel} por ${packageLabel || "embalagem"}`}</label>
          <input id="p-size" className="kb-input" inputMode="numeric" required value={packageSize} onChange={(event) => setPackageSize(event.target.value)} />
        </div>

        <div>
          <label className="kb-label" htmlFor="p-cost">{`Custo por ${packageLabel || "embalagem"} (R$)`}</label>
          <input id="p-cost" className="kb-input" inputMode="decimal" required value={cost} onChange={(event) => setCost(event.target.value)} placeholder="39,90" />
        </div>
        <div>
          <label className="kb-label" htmlFor="p-min">{`Estoque mínimo (${packageLabel || "embalagens"})`}</label>
          <input id="p-min" className="kb-input" inputMode="decimal" value={minPackages} onChange={(event) => setMinPackages(event.target.value)} placeholder="2" />
        </div>
        <div>
          <label className="kb-label" htmlFor="p-target">{`Estoque ideal (${packageLabel || "embalagens"})`}</label>
          <input id="p-target" className="kb-input" inputMode="decimal" value={targetPackages} onChange={(event) => setTargetPackages(event.target.value)} placeholder="Vazio = dobro do mínimo" />
        </div>
        <div>
          <label className="kb-label" htmlFor="p-supplier">Fornecedor</label>
          <select id="p-supplier" className="kb-input" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
            <option value="">Sem fornecedor</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="kb-label" htmlFor="p-barcode">Código de barras (opcional)</label>
          <input id="p-barcode" className="kb-input" maxLength={40} value={barcode} onChange={(event) => setBarcode(event.target.value.trim())} />
        </div>
        {unit === "UN" ? (
          <div className="flex items-end gap-3">
            <label className="flex items-center gap-2 pb-3 text-sm">
              <input type="checkbox" checked={returnable} onChange={(event) => setReturnable(event.target.checked)} className="h-4 w-4 accent-[#c8102e]" />
              Garrafa retornável
            </label>
            {returnable ? (
              <div className="flex-1">
                <label className="kb-label" htmlFor="p-deposit">Valor da garrafa vazia (R$)</label>
                <input id="p-deposit" className="kb-input" inputMode="decimal" value={deposit} onChange={(event) => setDeposit(event.target.value)} placeholder="1,50" />
              </div>
            ) : null}
          </div>
        ) : null}
        {product ? (
          <label className="flex items-center gap-2 self-end pb-3 text-sm">
            <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="h-4 w-4 accent-[#c8102e]" />
            Produto ativo
          </label>
        ) : null}
      </div>

      {!product ? (
        <p className="text-xs text-kb-muted">O produto começa com estoque zero. Depois de salvar, registre a primeira entrada em Entradas e perdas.</p>
      ) : null}

      {error ? <Notice kind="error">{error}</Notice> : null}

      <div className="flex gap-2">
        <button type="submit" className="kb-btn" disabled={saving}>
          {saving ? "Salvando..." : "Salvar produto"}
        </button>
        <button type="button" className="kb-btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
