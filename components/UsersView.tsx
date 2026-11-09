"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/client";
import { formatDateTime } from "@/lib/format";
import { EmptyRow, Notice, PageHeader, Section } from "./ui";

type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
  active: boolean;
  createdAt: string;
};

export function UsersView({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<User[] | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "STAFF">("STAFF");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const load = useCallback(async () => {
    const data = await api<{ users: User[] }>("/api/usuarios");
    setUsers(data.users);
  }, []);

  useEffect(() => {
    load().catch((reason) => setMessage({ kind: "error", text: errorMessage(reason) }));
  }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api("/api/usuarios", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role }),
      });
      setMessage({ kind: "success", text: `Acesso criado para ${name}.` });
      setName("");
      setEmail("");
      setPassword("");
      setRole("STAFF");
      await load();
    } catch (reason) {
      setMessage({ kind: "error", text: errorMessage(reason) });
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(user: User) {
    const next = window.prompt(`Nova senha para ${user.name} (mínimo 8 caracteres):`);
    if (next === null) {
      return;
    }
    setMessage(null);
    try {
      await api(`/api/usuarios/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ password: next }),
      });
      setMessage({ kind: "success", text: `Senha de ${user.name} trocada. Passe a nova senha para a pessoa.` });
    } catch (reason) {
      setMessage({ kind: "error", text: errorMessage(reason) });
    }
  }

  async function toggle(user: User) {
    setMessage(null);
    try {
      await api(`/api/usuarios/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !user.active }),
      });
      await load();
    } catch (reason) {
      setMessage({ kind: "error", text: errorMessage(reason) });
    }
  }

  return (
    <>
      <PageHeader
        title="Usuários"
      />

      <Section title="Novo acesso">
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_180px_160px_auto] xl:items-end">
          <div>
            <label className="kb-label" htmlFor="u-name">Nome</label>
            <input id="u-name" className="kb-input" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <label className="kb-label" htmlFor="u-email">E-mail</label>
            <input id="u-email" type="email" className="kb-input" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div>
            <label className="kb-label" htmlFor="u-password">Senha inicial</label>
            <input id="u-password" type="password" className="kb-input" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          <div>
            <label className="kb-label" htmlFor="u-role">Perfil</label>
            <select id="u-role" className="kb-input" value={role} onChange={(event) => setRole(event.target.value as "ADMIN" | "STAFF")}>
              <option value="STAFF">Funcionário</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <button type="submit" className="kb-btn" disabled={saving}>
            Criar acesso
          </button>
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
              <th>Nome</th>
              <th>E-mail</th>
              <th>Perfil</th>
              <th>Desde</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {!users ? (
              <EmptyRow colSpan={5}>Carregando...</EmptyRow>
            ) : (
              users.map((user) => (
                <tr key={user.id} className={user.active ? "" : "opacity-50"}>
                  <td className="font-medium">
                    {user.name}
                    {user.id === currentUserId ? <span className="ml-2 text-xs text-kb-muted">(você)</span> : null}
                  </td>
                  <td className="text-kb-muted">{user.email}</td>
                  <td>{user.role === "ADMIN" ? "Administrador" : "Funcionário"}</td>
                  <td className="whitespace-nowrap text-kb-muted">{formatDateTime(user.createdAt)}</td>
                  <td className="whitespace-nowrap text-right">
                    {user.id !== currentUserId && user.active ? (
                      <button type="button" className="mr-3 text-sm text-kb-info hover:underline" onClick={() => resetPassword(user)}>
                        Nova senha
                      </button>
                    ) : null}
                    {user.id !== currentUserId ? (
                      <button type="button" className={user.active ? "kb-btn-danger" : "kb-btn-ghost"} onClick={() => toggle(user)}>
                        {user.active ? "Desativar" : "Reativar"}
                      </button>
                    ) : null}
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
