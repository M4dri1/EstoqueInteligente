import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/lib/services/auth-service";
import { readJson } from "@/lib/api";

export async function POST(request: NextRequest) {
  const body = await readJson(request);
  if (body === undefined) {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const result = await authService.loginFromRequest({
    body,
    headers: request.headers,
    ipFallback: request.ip,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, name: result.data.name, role: result.data.role });
}
