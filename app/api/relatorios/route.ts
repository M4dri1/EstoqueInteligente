import { NextRequest, NextResponse } from "next/server";
import { ADMIN_ONLY, withUser } from "@/lib/api";
import { periodSchema } from "@/lib/validation";
import { reportService } from "@/lib/services/report-service";

export async function GET(request: NextRequest) {
  return withUser(ADMIN_ONLY, async () => {
    const params = request.nextUrl.searchParams;
    const parsed = periodSchema.safeParse({ days: params.get("dias") ?? undefined });
    const days = parsed.success ? parsed.data.days : 30;

    if (params.get("format") === "csv") {
      const csv = await reportService.stockCsv(days);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="estoque-inteligente-${days}d.csv"`,
        },
      });
    }

    return NextResponse.json(await reportService.build(days));
  });
}
