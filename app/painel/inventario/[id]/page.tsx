import { getActiveUser } from "@/lib/auth";
import { InventoryCountView } from "@/components/InventoryCountView";

export default async function InventoryCountPage({ params }: { params: { id: string } }) {
  const user = await getActiveUser();
  return <InventoryCountView id={params.id} isAdmin={user?.role === "ADMIN"} />;
}
