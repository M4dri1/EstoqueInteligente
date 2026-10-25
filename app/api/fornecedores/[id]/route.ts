import { NextRequest } from "next/server";
import { ADMIN_ONLY, readJson, respond, withUser } from "@/lib/api";
import { supplierService } from "@/lib/services/supplier-service";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return withUser(ADMIN_ONLY, async () =>
    respond(await supplierService.save(await readJson(request), params.id))
  );
}
