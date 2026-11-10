"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Falha no login.");
        return;
      }
      router.push(payload.role === "ADMIN" ? "/painel" : "/painel/balcao");
      router.refresh();
    } catch {
      setError("Falha de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm px-4 pt-24">
      <div className="mb-4">
        <h1 className="text-lg font-semibold">Estoque Inteligente</h1>
        <p className="text-sm text-kb-muted">Kassius Bar</p>
      </div>
      <form onSubmit={handleSubmit} className="kb-card w-full space-y-4 p-5">

        <div>
          <label htmlFor="email" className="kb-label">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="kb-input"
          />
        </div>

        <div>
          <label htmlFor="password" className="kb-label">
            Senha
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="kb-input"
          />
        </div>

        {error ? (
          <p className="rounded border border-kb-error-line bg-kb-error-bg px-3 py-2 text-sm text-kb-danger">{error}</p>
        ) : null}

        <button type="submit" className="kb-btn w-full" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <div className="mt-3 flex justify-end">
        <ThemeToggle className="text-kb-muted hover:bg-kb-raised hover:text-kb-ink" />
      </div>
    </main>
  );
}
