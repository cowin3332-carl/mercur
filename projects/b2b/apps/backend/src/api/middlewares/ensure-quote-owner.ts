import { AuthenticatedMedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export async function ensureQuoteOwner(req: AuthenticatedMedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  const id = req.originalUrl.match(/^\/store\/quotes\/([^/?]+)/)?.[1];
  if (!id) return next();
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data: quotes } = await query.graph({ entity: "quote", fields: ["id"], filters: { id, customer_id: req.auth_context.actor_id } });
  if (!quotes.length) return res.status(404).json({ message: "Quote not found" });
  return next();
}
