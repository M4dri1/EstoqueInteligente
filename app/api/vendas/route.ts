import { NextRequest, NextResponse } from "next/server";
import { ALL_ROLES, readJson, respond, withUser } from "@/lib/api";
import { saleService } from "@/lib/services/sale-service";

export async function GET() {
  return withUser(ALL_ROLES, async () =>
    NextResponse.json({ sales: await saleService.recent() })
  );
}

export async function POST(request: NextRequest) {
  return withUser(ALL_ROLES, async (user) =>
    respond(await saleService.register(await readJson(request), user))
  );
}
