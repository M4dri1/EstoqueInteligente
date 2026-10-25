"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

type NavItem = { href: string; label: string; adminOnly?: boolean };

const ITEMS: NavItem[] = [
  { href: "/painel/estoque", label: "Estoque" },
  { href: "/painel/fornecedores", label: "Fornecedores", adminOnly: true },
];

export function AppNav({ name, role }: { name: string; role: "ADMIN" | "STAFF" }) {
  const pathname = usePathname();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const items = ITEMS.filter((item) => !item.adminOnly || role === "ADMIN");

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
    <header className="no-print border-b-4 border-[#6e0814] bg-kb-night">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4">
        <Link href="/painel" className="whitespace-nowrap py-3 text-base font-extrabold uppercase tracking-wide text-white">
          Estoque Inteligente
        </Link>
        <nav className="flex flex-1 overflow-x-auto [scrollbar-width:none]">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`kb-nav-link ${isActive(item.href) ? "active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <span className="hidden whitespace-nowrap text-sm text-[#ffc2c7] xl:inline">{name}</span>
        <button
          type="button"
          onClick={logout}
          disabled={leaving}
          className="text-sm text-[#ffd9dc] hover:text-white"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
