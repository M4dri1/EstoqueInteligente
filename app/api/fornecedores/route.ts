import { NextRequest, NextResponse } from "next/server";
import { ADMIN_ONLY, readJson, respond, withUser } from "@/lib/api";
import { supplierService } from "@/lib/services/supplier-service";

export async function GET() {
  return withUser(ADMIN_ONLY, async () =>
    NextResponse.json({ suppliers: await supplierService.list() })
  );
}

export async function POST(request: NextRequest) {
  return withUser(ADMIN_ONLY, async () =>
    respond(await supplierService.save(await readJson(request)))
  );
}
