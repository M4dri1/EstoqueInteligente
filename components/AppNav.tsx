"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

type NavItem = { href: string; label: string; adminOnly?: boolean };

const GROUPS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Operação",
    items: [
      { href: "/painel", label: "Painel" },
      { href: "/painel/balcao", label: "Balcão" },
      { href: "/painel/estoque", label: "Estoque" },
      { href: "/painel/movimentacoes", label: "Entradas e perdas" },
      { href: "/painel/inventario", label: "Contagem" },
    ],
  },
  {
    title: "Cadastros",
    items: [
      { href: "/painel/cardapio", label: "Cardápio", adminOnly: true },
      { href: "/painel/fornecedores", label: "Fornecedores", adminOnly: true },
      { href: "/painel/usuarios", label: "Usuários", adminOnly: true },
    ],
  },
  {
    title: "Gestão",
    items: [{ href: "/painel/relatorios", label: "Relatórios", adminOnly: true }],
  },
];

export function AppNav({ name, role }: { name: string; role: "ADMIN" | "STAFF" }) {
  const pathname = usePathname();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [open, setOpen] = useState(false);
  const groups = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.adminOnly || role === "ADMIN"),
  })).filter((group) => group.items.length > 0);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function isActive(href: string) {
    return href === "/painel" ? pathname === href : pathname.startsWith(href);
  }

  async function logout() {
    setLeaving(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <div className="no-print sticky top-0 z-30 flex items-center justify-between bg-kb-night px-4 py-2.5 text-white lg:hidden">
        <Link href="/painel" className="text-sm font-semibold">
          Estoque Inteligente
        </Link>
        <button type="button" onClick={() => setOpen((value) => !value)} className="rounded border border-white/20 px-2.5 py-1 text-sm text-[#c5cbd3]">
          {open ? "Fechar" : "Menu"}
        </button>
      </div>

      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 flex w-56 flex-col bg-kb-night text-white transition-transform [color-scheme:dark] lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-sm font-semibold">Estoque Inteligente</p>
          <p className="text-xs text-[#8b95a1]">Kassius Bar</p>
        </div>

        <nav className="kb-scroll flex-1 overflow-y-auto px-2 py-2">
          {groups.map((group) => (
            <div key={group.title} className="mb-2 border-t border-white/10 pt-2 first:border-t-0 first:pt-0">
              <p className="px-3 pb-1 pt-1 text-xs font-semibold text-[#e5484f]">{group.title}</p>
              {group.items.map((item) => (
                <Link key={item.href} href={item.href} className={`kb-nav-link ${isActive(item.href) ? "active" : ""}`}>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-2 py-2">
          <p className="truncate px-3 pb-1 text-xs text-[#8b95a1]">{name}</p>
          <Link href="/painel/senha" className={`kb-nav-link ${isActive("/painel/senha") ? "active" : ""}`}>
            Minha senha
          </Link>
          <div className="flex items-center justify-between px-1 pt-1">
            <button type="button" onClick={logout} disabled={leaving} className="rounded px-2 py-1.5 text-sm text-[#c5cbd3] hover:bg-white/5 hover:text-white">
              Sair
            </button>
            <ThemeToggle className="text-[#c5cbd3] hover:bg-white/5 hover:text-white" />
          </div>
        </div>
      </aside>

      {open ? <button type="button" aria-label="Fechar menu" className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} /> : null}
    </>
  );
}
