import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createCompaniesWorkflow } from "../../../workflows/company/workflows/create-companies";
import { StoreCreateCompanyType } from "./validators";
import { createEmployeesWorkflow } from "../../../workflows/employee/workflows";

export const POST = async (
  req: AuthenticatedMedusaRequest<
    StoreCreateCompanyType | StoreCreateCompanyType[]
  >,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data: customers } = await query.graph({
    entity: "customer", fields: ["id", "employee.id"], filters: { id: req.auth_context.actor_id },
  });
  if (customers[0]?.employee?.id) return res.status(409).json({ message: "Customer already belongs to a company" });

  const { result: createdCompanies } = await createCompaniesWorkflow.run({
    input: Array.isArray(req.validatedBody)
      ? req.validatedBody.map((company) => ({ ...company }))
      : [{ ...req.validatedBody }],
    container: req.scope,
  });

  await createEmployeesWorkflow.run({
    input: {
      employeeData: { company_id: createdCompanies[0].id, is_admin: true, spending_limit: 0 },
      customerId: req.auth_context.actor_id,
    },
    container: req.scope,
  });
  const { data: companies } = await query.graph(
    {
      entity: "companies",
      fields: req.queryConfig.fields,
      filters: { id: createdCompanies.map((company) => company.id) },
    },
    { throwIfKeyNotFound: true }
  );

  res.json({ companies });
};
