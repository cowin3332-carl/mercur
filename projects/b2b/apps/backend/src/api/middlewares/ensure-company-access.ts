import { AuthenticatedMedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export async function ensureCompanyAccess(req: AuthenticatedMedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  const id = req.originalUrl.match(/^\/store\/companies\/([^/?]+)/)?.[1];
  if (!id) return next();
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data: customers } = await query.graph({
    entity: "customer", fields: ["id", "employee.company_id", "employee.is_admin"],
    filters: { id: req.auth_context.actor_id },
  });
  const employee = customers[0]?.employee;
  if (employee?.company_id !== id) return res.status(403).json({ message: "Forbidden" });
  if (req.method !== "GET" && !employee.is_admin) return res.status(403).json({ message: "Company administrator required" });
  return next();
}
