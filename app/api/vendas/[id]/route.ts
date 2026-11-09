import { ALL_ROLES, respond, withUser } from "@/lib/api";
import { saleService } from "@/lib/services/sale-service";

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  return withUser(ALL_ROLES, async (user) => respond(await saleService.cancel(params.id, user)));
}
