import { NextRequest } from "next/server";
import { ADMIN_ONLY, readJson, respond, withUser } from "@/lib/api";
import { productService } from "@/lib/services/product-service";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return withUser(ADMIN_ONLY, async () =>
    respond(await productService.update(params.id, await readJson(request)))
  );
}
