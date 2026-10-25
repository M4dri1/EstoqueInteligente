import { redirect } from "next/navigation";
import { getActiveUser } from "@/lib/auth";
import { AppNav } from "@/components/AppNav";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getActiveUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <AppNav name={user.name} role={user.role} />
      <main className="mx-auto max-w-7xl px-4 py-5">{children}</main>
    </div>
  );
}
