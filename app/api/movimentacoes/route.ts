import { NextRequest, NextResponse } from "next/server";
import { ALL_ROLES, readJson, respond, withUser } from "@/lib/api";
import { movementService } from "@/lib/services/movement-service";

export async function GET(request: NextRequest) {
  return withUser(ALL_ROLES, async () => {
    const params = request.nextUrl.searchParams;
    const days = Math.min(Math.max(Number(params.get("dias")) || 30, 1), 365);
    const movements = await movementService.list({
      type: params.get("tipo"),
      productId: params.get("produto"),
      days,
    });
    return NextResponse.json({ movements });
  });
}

export async function POST(request: NextRequest) {
  return withUser(ALL_ROLES, async (user) =>
    respond(await movementService.register(await readJson(request), user))
  );
}
