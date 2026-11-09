"use client";

import { FormEvent, useState } from "react";
import { api, errorMessage } from "@/lib/client";
import { Notice, PageHeader, Section } from "./ui";

export function PasswordView() {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (password !== confirm) {
      setMessage({ kind: "error", text: "A confirmação não bate com a nova senha." });
      return;
    }
    setSaving(true);
    try {
      await api("/api/conta/senha", {
        method: "POST",
        body: JSON.stringify({ current, password }),
      });
      setCurrent("");
      setPassword("");
      setConfirm("");
      setMessage({ kind: "success", text: "Senha trocada. Use a nova no próximo login." });
    } catch (reason) {
      setMessage({ kind: "error", text: errorMessage(reason) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Minha senha" />
      <Section>
        <form onSubmit={submit} className="max-w-sm space-y-4">
          <div>
            <label className="kb-label" htmlFor="s-current">Senha atual</label>
            <input id="s-current" type="password" className="kb-input" required autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} />
          </div>
          <div>
            <label className="kb-label" htmlFor="s-new">Nova senha (mínimo 8 caracteres)</label>
            <input id="s-new" type="password" className="kb-input" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          <div>
            <label className="kb-label" htmlFor="s-confirm">Repita a nova senha</label>
            <input id="s-confirm" type="password" className="kb-input" required minLength={8} autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
          </div>
          {message ? <Notice kind={message.kind}>{message.text}</Notice> : null}
          <button type="submit" className="kb-btn" disabled={saving}>
            {saving ? "Salvando..." : "Trocar senha"}
          </button>
        </form>
      </Section>
    </>
  );
}
