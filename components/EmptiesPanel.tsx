"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/client";
import { formatCents, formatStock } from "@/lib/format";
import type { UnitCode } from "@/lib/stock";
import { Notice, Section } from "./ui";

export type ReturnableProduct = {
  id: string;
  name: string;
  unit: UnitCode;
  packageLabel: string;
  packageSize: number;
  currentStock: number;
  emptyStock: number;
  depositCents: number;
};

export function EmptiesPanel({
  products,
  isAdmin,
  onChanged,
}: {
  products: ReturnableProduct[];
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (products.length === 0) {
    return null;
  }

  const totalEmpties = products.reduce((sum, product) => sum + product.emptyStock, 0);
  const totalValue = products.reduce((sum, product) => sum + product.emptyStock * product.depositCents, 0);

  async function save(id: string) {
    const emptyStock = Number(value);
    if (!Number.isInteger(emptyStock) || emptyStock < 0) {
      setError("Informe quantas garrafas vazias tem, em número inteiro.");
      return;
    }
    setError(null);
    try {
      await api(`/api/produtos/${id}/garrafas`, {
        method: "PATCH",
        body: JSON.stringify({ emptyStock }),
      });
      setEditing(null);
      onChanged();
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }

  return (
    <Section
      title="Garrafas retornáveis"
      description={`${totalEmpties} vazias no depósito${isAdmin ? ` · ${formatCents(totalValue)} em garrafas` : ""}`}
      flush
    >
      {error ? <div className="p-3"><Notice kind="error">{error}</Notice></div> : null}
      <div className="overflow-x-auto">
        <table className="kb-table">
          <thead>
            <tr>
              <th>Cerveja</th>
              <th>Cheias</th>
              <th>Vazias</th>
              <th>Engradados vazios</th>
              {isAdmin ? <th>Valor das vazias</th> : null}
              {isAdmin ? <th /> : null}
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td className="font-medium">{product.name}</td>
                <td className="whitespace-nowrap tabular-nums">
                  {formatStock(product.currentStock, product.unit, product.packageSize, product.packageLabel)}
                </td>
                <td className="tabular-nums">
                  {editing === product.id ? (
                    <input
                      className="kb-input w-24"
                      inputMode="numeric"
                      autoFocus
                      value={value}
                      onChange={(event) => setValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          save(product.id);
                        }
                      }}
                      aria-label={`Garrafas vazias de ${product.name}`}
                    />
                  ) : (
                    product.emptyStock
                  )}
                </td>
                <td className="tabular-nums text-kb-muted">
                  {Math.floor(product.emptyStock / product.packageSize)}
                </td>
                {isAdmin ? (
                  <td className="tabular-nums">{formatCents(product.emptyStock * product.depositCents)}</td>
                ) : null}
                {isAdmin ? (
                  <td className="whitespace-nowrap text-right">
                    {editing === product.id ? (
                      <>
                        <button type="button" className="mr-3 text-sm text-kb-info hover:underline" onClick={() => save(product.id)}>
                          Salvar
                        </button>
                        <button type="button" className="text-sm text-kb-muted hover:text-kb-ink" onClick={() => setEditing(null)}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="text-sm text-kb-muted hover:text-kb-ink"
                        onClick={() => {
                          setEditing(product.id);
                          setValue(String(product.emptyStock));
                        }}
                      >
                        Corrigir
                      </button>
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
