import { NextRequest, NextResponse } from "next/server";
import { ADMIN_ONLY, readJson, respond, withUser } from "@/lib/api";
import { userService } from "@/lib/services/user-service";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return withUser(ADMIN_ONLY, async (user) => {
    const body = (await readJson(request)) as { active?: unknown; password?: unknown } | undefined;
    if (body?.password !== undefined) {
      return respond(await userService.resetPassword(params.id, body));
    }
    if (typeof body?.active !== "boolean") {
      return NextResponse.json({ error: "Informe se o usuário fica ativo." }, { status: 400 });
    }
    return respond(await userService.setActive(params.id, body.active, user));
  });
}
