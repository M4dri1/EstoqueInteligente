import { NextResponse } from "next/server";
import { ALL_ROLES, withUser } from "@/lib/api";
import { reportService } from "@/lib/services/report-service";

export async function GET() {
  return withUser(ALL_ROLES, async (user) => {
    const dashboard = await reportService.dashboard();
    if (user.role === "ADMIN") {
      return NextResponse.json(dashboard);
    }
    return NextResponse.json({
      alerts: dashboard.alerts.map((row) => ({ ...row, stockValueCents: 0, costCents: 0 })),
      empties: { ...dashboard.empties, valueCents: 0 },
      lastCount: dashboard.lastCount,
      recent: dashboard.recent.map((row) => ({ ...row, costCents: 0 })),
    });
  });
}
