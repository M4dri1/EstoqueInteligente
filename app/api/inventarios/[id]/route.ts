import { NextRequest, NextResponse } from "next/server";
import { ALL_ROLES, readJson, respond, withUser } from "@/lib/api";
import { inventoryService } from "@/lib/services/inventory-service";

type Context = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: Context) {
  return withUser(ALL_ROLES, async () => {
    const inventory = await inventoryService.detail(params.id);
    if (!inventory) {
      return NextResponse.json({ error: "Contagem não encontrada." }, { status: 404 });
    }
    return NextResponse.json({ inventory });
  });
}

export async function PATCH(request: NextRequest, { params }: Context) {
  return withUser(ALL_ROLES, async () =>
    respond(await inventoryService.save(params.id, await readJson(request)))
  );
}

export async function POST(_request: NextRequest, { params }: Context) {
  return withUser(ALL_ROLES, async (user) => respond(await inventoryService.close(params.id, user)));
}
