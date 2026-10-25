import { NextResponse } from "next/server";
import { getActiveUser, type RoleCode, type SessionPayload } from "./auth";

export type ServiceResult<T> =
  | { ok: true; data: T; status?: number }
  | { ok: false; error: string; status: number };

export function fail(status: number, error: string): ServiceResult<never> {
  return { ok: false, status, error };
}

export function respond<T>(result: ServiceResult<T>) {
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data, { status: result.status ?? 200 });
}

export async function readJson(request: Request): Promise<unknown | undefined> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export async function withUser(
  roles: RoleCode[],
  handler: (user: SessionPayload) => Promise<Response>
) {
  const user = await getActiveUser();
  if (!user) {
    return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  }
  if (!roles.includes(user.role)) {
    return NextResponse.json(
      { error: "Seu perfil não tem permissão para esta ação." },
      { status: 403 }
    );
  }
  return handler(user);
}

export const ALL_ROLES: RoleCode[] = ["ADMIN", "STAFF"];
export const ADMIN_ONLY: RoleCode[] = ["ADMIN"];
