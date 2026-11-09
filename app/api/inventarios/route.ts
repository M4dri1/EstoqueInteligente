import { NextRequest, NextResponse } from "next/server";
import { ALL_ROLES, readJson, respond, withUser } from "@/lib/api";
import { inventoryService } from "@/lib/services/inventory-service";

export async function GET() {
  return withUser(ALL_ROLES, async () =>
    NextResponse.json({ inventories: await inventoryService.list() })
  );
}

export async function POST(request: NextRequest) {
  return withUser(ALL_ROLES, async (user) =>
    respond(await inventoryService.open(await readJson(request), user))
  );
}
