import { NextRequest } from "next/server";
import { ADMIN_ONLY, readJson, respond, withUser } from "@/lib/api";
import { movementService } from "@/lib/services/movement-service";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return withUser(ADMIN_ONLY, async (user) =>
    respond(await movementService.setEmpties(params.id, await readJson(request), user))
  );
}
