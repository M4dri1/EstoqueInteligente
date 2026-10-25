import { getActiveUser } from "@/lib/auth";
import { ProductsView } from "@/components/ProductsView";

export default async function StockPage() {
  const user = await getActiveUser();
  return <ProductsView isAdmin={user?.role === "ADMIN"} />;
}
