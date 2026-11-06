import { getActiveUser } from "@/lib/auth";
import { MovementsView } from "@/components/MovementsView";

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: { produto?: string };
}) {
  const user = await getActiveUser();
  return (
    <MovementsView
      isAdmin={user?.role === "ADMIN"}
      initialProductId={typeof searchParams.produto === "string" ? searchParams.produto : undefined}
    />
  );
}
