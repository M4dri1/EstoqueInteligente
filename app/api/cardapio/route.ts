import { NextRequest, NextResponse } from "next/server";
import { ADMIN_ONLY, ALL_ROLES, readJson, respond, withUser } from "@/lib/api";
import { recipeService } from "@/lib/services/recipe-service";

export async function GET(request: NextRequest) {
  return withUser(ALL_ROLES, async (user) => {
    const includeInactive =
      user.role === "ADMIN" && request.nextUrl.searchParams.get("inativos") === "1";
    return NextResponse.json({ recipes: await recipeService.list(includeInactive) });
  });
}

export async function POST(request: NextRequest) {
  return withUser(ADMIN_ONLY, async () =>
    respond(await recipeService.save(await readJson(request)))
  );
}
