"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/client";
import { formatDateTime } from "@/lib/format";
import { CATEGORIES } from "@/lib/validation";
import { EmptyRow, Notice, PageHeader, Section } from "./ui";

type Inventory = {
  id: string;
  status: "ABERTO" | "FECHADO";
  createdAt: string;
  closedAt: string | null;
  categories: string[];
  user: { name: string };
  _count: { items: number };
};

const QUICK_DEFAULT = ["Cervejas", "Pinga e destilados"];

export function InventoryListView() {
  const router = useRouter();
  const [inventories, setInventories] = useState<Inventory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [picked, setPicked] = useState<string[]>(QUICK_DEFAULT);

  useEffect(() => {
    api<{ inventories: Inventory[] }>("/api/inventarios")
      .then((data) => setInventories(data.inventories))
      .catch((reason) => setError(errorMessage(reason)));
  }, []);

  const open = inventories?.find((item) => item.status === "ABERTO");

  async function start(categories: string[]) {
    setOpening(true);
    setError(null);
    try {
      const result = await api<{ id: string }>("/api/inventarios", {
        method: "POST",
        body: JSON.stringify({ categories }),
      });
      router.push(`/painel/inventario/${result.id}`);
    } catch (reason) {
      setError(errorMessage(reason));
      setOpening(false);
    }
  }

  function toggle(category: string) {
    setPicked((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category]
    );
  }

  return (
    <>
      <PageHeader
        title="Contagem de estoque"
        actions={
          open ? (
            <Link href={`/painel/inventario/${open.id}`} className="kb-btn">
              Continuar contagem aberta
            </Link>
          ) : null
        }
      />

      {error ? <Notice kind="error">{error}</Notice> : null}

      {inventories && !open ? (
        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <Section title="Contagem rápida">
            <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2">
              {CATEGORIES.map((category) => (
                <label key={category} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={picked.includes(category)}
                    onChange={() => toggle(category)}
                    className="h-4 w-4 accent-[#b3242b]"
                  />
                  {category}
                </label>
              ))}
            </div>
            <button
              type="button"
              className="kb-btn"
              disabled={opening || picked.length === 0}
              onClick={() => start(picked)}
            >
              {opening ? "Abrindo..." : "Iniciar contagem"}
            </button>
          </Section>
          <Section title="Contagem completa">
            <p className="mb-3 text-sm text-kb-muted">Todos os produtos ativos.</p>
            <button type="button" className="kb-btn-ghost" disabled={opening} onClick={() => start([])}>
              Contar tudo
            </button>
          </Section>
        </div>
      ) : null}

      <Section title="Contagens" flush>
        <table className="kb-table">
          <thead>
            <tr>
              <th>Início</th>
              <th>Fechamento</th>
              <th>O que foi contado</th>
              <th>Itens</th>
              <th>Responsável</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {!inventories ? (
              <EmptyRow colSpan={7}>Carregando...</EmptyRow>
            ) : inventories.length === 0 ? (
              <EmptyRow colSpan={7}>Nenhuma contagem feita ainda.</EmptyRow>
            ) : (
              inventories.map((item) => (
                <tr key={item.id}>
                  <td className="whitespace-nowrap">{formatDateTime(item.createdAt)}</td>
                  <td className="whitespace-nowrap text-kb-muted">{item.closedAt ? formatDateTime(item.closedAt) : "—"}</td>
                  <td className="text-kb-muted">{item.categories.length ? item.categories.join(", ") : "Tudo"}</td>
                  <td className="tabular-nums">{item._count.items}</td>
                  <td className="text-kb-muted">{item.user.name}</td>
                  <td>
                    <span className={`text-xs font-semibold ${item.status === "ABERTO" ? "text-kb-warn" : "text-kb-muted"}`}>
                      {item.status === "ABERTO" ? "Aberta" : "Fechada"}
                    </span>
                  </td>
                  <td className="text-right">
                    <Link href={`/painel/inventario/${item.id}`} className="text-sm text-kb-info hover:underline">
                      {item.status === "ABERTO" ? "Contar" : "Ver resultado"}
                    </Link>
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
