import { getActiveUser } from "@/lib/auth";
import { UsersView } from "@/components/UsersView";

export default async function UsersPage() {
  const user = await getActiveUser();
  return <UsersView currentUserId={user?.userId ?? ""} />;
}
