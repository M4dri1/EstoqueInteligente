"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

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
      router.push("/painel");
      router.refresh();
    } catch {
      setError("Falha de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm px-4 pt-24">
      <h1 className="mb-4 rounded-md border-b-4 border-[#6e0814] bg-kb-night py-3 text-center text-lg font-extrabold uppercase tracking-wide text-white">Estoque Inteligente</h1>
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
          <p className="rounded-md border border-kb-error-line bg-kb-error-bg px-3 py-2 text-sm text-kb-danger">{error}</p>
        ) : null}

        <button type="submit" className="kb-btn w-full" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
