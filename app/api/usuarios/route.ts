import { NextRequest, NextResponse } from "next/server";
import { ADMIN_ONLY, readJson, respond, withUser } from "@/lib/api";
import { userService } from "@/lib/services/user-service";

export async function GET() {
  return withUser(ADMIN_ONLY, async () =>
    NextResponse.json({ users: await userService.list() })
  );
}

export async function POST(request: NextRequest) {
  return withUser(ADMIN_ONLY, async () =>
    respond(await userService.create(await readJson(request)))
  );
}
