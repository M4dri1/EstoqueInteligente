import { getActiveUser } from "@/lib/auth";
import { DashboardView } from "@/components/DashboardView";

export default async function PanelPage() {
  const user = await getActiveUser();
  return <DashboardView isAdmin={user?.role === "ADMIN"} />;
}
