import { NextRequest, NextResponse } from "next/server";
import { ADMIN_ONLY, ALL_ROLES, readJson, respond, withUser } from "@/lib/api";
import { productService } from "@/lib/services/product-service";

export async function GET(request: NextRequest) {
  return withUser(ALL_ROLES, async () => {
    const params = request.nextUrl.searchParams;
    const products = await productService.list({
      search: params.get("busca")?.trim() || undefined,
      category: params.get("categoria") || undefined,
      includeInactive: params.get("inativos") === "1",
    });
    return NextResponse.json({ products });
  });
}

export async function POST(request: NextRequest) {
  return withUser(ADMIN_ONLY, async () =>
    respond(await productService.create(await readJson(request)))
  );
}
