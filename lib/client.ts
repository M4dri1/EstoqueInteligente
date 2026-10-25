export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (response.status === 401) {
    window.location.href = "/login";
    throw new Error("Sessão expirada. Entre novamente.");
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Não foi possível concluir a ação.");
  }
  return payload as T;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Falha de conexão.";
}
