"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/client";
import { EmptyRow, Notice, PageHeader, Section } from "./ui";

type Supplier = {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  _count: { products: number };
};

export function SuppliersView() {
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const load = useCallback(async () => {
    const data = await api<{ suppliers: Supplier[] }>("/api/fornecedores");
    setSuppliers(data.suppliers);
  }, []);

  useEffect(() => {
    load().catch((reason) => setMessage({ kind: "error", text: errorMessage(reason) }));
  }, [load]);

  function edit(supplier: Supplier | null) {
    setEditingId(supplier?.id ?? null);
    setName(supplier?.name ?? "");
    setPhone(supplier?.phone ?? "");
    setNotes(supplier?.notes ?? "");
    setMessage(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api(editingId ? `/api/fornecedores/${editingId}` : "/api/fornecedores", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify({ name, phone: phone || null, notes: notes || null }),
      });
      setMessage({ kind: "success", text: `${name} salvo.` });
      edit(null);
      await load();
    } catch (reason) {
      setMessage({ kind: "error", text: errorMessage(reason) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Fornecedores" />

      <Section title={editingId ? "Editar fornecedor" : "Novo fornecedor"}>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-[1fr_200px_1fr_auto] md:items-end">
          <div>
            <label className="kb-label" htmlFor="s-name">Nome</label>
            <input id="s-name" className="kb-input" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <label className="kb-label" htmlFor="s-phone">Telefone / WhatsApp</label>
            <input id="s-phone" className="kb-input" maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>
          <div>
            <label className="kb-label" htmlFor="s-notes">Observações</label>
            <input id="s-notes" className="kb-input" maxLength={300} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Dia de entrega, pedido mínimo..." />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="kb-btn" disabled={saving}>
              Salvar
            </button>
            {editingId ? (
              <button type="button" className="kb-btn-ghost" onClick={() => edit(null)}>
                Cancelar
              </button>
            ) : null}
          </div>
        </form>
        {message ? (
          <div className="mt-4">
            <Notice kind={message.kind}>{message.text}</Notice>
          </div>
        ) : null}
      </Section>

      <Section flush>
        <table className="kb-table">
          <thead>
            <tr>
              <th>Fornecedor</th>
              <th>Contato</th>
              <th>Produtos</th>
              <th>Observações</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {!suppliers ? (
              <EmptyRow colSpan={5}>Carregando...</EmptyRow>
            ) : suppliers.length === 0 ? (
              <EmptyRow colSpan={5}>Nenhum fornecedor cadastrado.</EmptyRow>
            ) : (
              suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td className="font-medium">{supplier.name}</td>
                  <td className="text-kb-muted">{supplier.phone ?? "—"}</td>
                  <td className="tabular-nums">{supplier._count.products}</td>
                  <td className="text-kb-muted">{supplier.notes ?? "—"}</td>
                  <td className="text-right">
                    <button type="button" className="text-sm text-kb-info hover:underline" onClick={() => edit(supplier)}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Section>
    </>
  );
}
