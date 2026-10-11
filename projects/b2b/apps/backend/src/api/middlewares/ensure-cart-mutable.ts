import { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { getCartApprovalStatus } from "../../utils/get-cart-approval-status";

// Mercur owns addToCartWorkflow.validate. Keep the B2B guard at the HTTP
// boundary instead of registering a second handler on Medusa's single hook.
export async function ensureCartMutable(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  const match = req.originalUrl.match(/^\/store\/carts\/([^/?]+)(?:\/(.*))?/);
  if (!match || match[2]?.startsWith("approvals")) return next();
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data: carts } = await query.graph({ entity: "cart", fields: ["id", "approvals.*"], filters: { id: match[1] } });
  if (carts[0] && getCartApprovalStatus(carts[0]).isPendingApproval) return res.status(409).json({ message: "Cart is pending approval" });
  return next();
}
