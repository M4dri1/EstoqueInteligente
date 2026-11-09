import { NextRequest } from "next/server";
import { ALL_ROLES, readJson, respond, withUser } from "@/lib/api";
import { userService } from "@/lib/services/user-service";

export async function POST(request: NextRequest) {
  return withUser(ALL_ROLES, async (user) =>
    respond(await userService.changeOwnPassword(await readJson(request), user))
  );
}
