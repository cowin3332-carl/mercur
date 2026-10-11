import type { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { addToCartWorkflow } from "@medusajs/medusa/core-flows";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";
import { StoreAddLineItemsBulkType } from "../../../validators";

export async function POST(
  req: MedusaRequest<StoreAddLineItemsBulkType>,
  res: MedusaResponse
) {
  const { id } = req.params;
  const { line_items } = req.validatedBody;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const {
    data: [cart],
  } = await query.graph(
    {
      entity: "cart",
      fields: req.queryConfig.fields,
      filters: { id },
    },
    { throwIfKeyNotFound: true }
  );

  const { data: offers } = await query.graph({
    entity: "offer", fields: ["id", "variant_id"],
    filters: { id: line_items.map((item) => item.offer_id) },
  });
  const items = line_items.map((item) => {
    const offer = offers.find((offer) => offer.id === item.offer_id && offer.variant_id === item.variant_id);
    if (!offer) throw new MedusaError(MedusaError.Types.INVALID_DATA, "Offer does not match the selected variant");
    return { ...item, requires_shipping: true, metadata: { offer_id: item.offer_id } };
  });
  const workflowInput = {
    cart_id: cart.id,
    items,
  };

  await addToCartWorkflow(req.scope).run({
    input: workflowInput,
  });

  const {
    data: [upatedCart],
  } = await query.graph(
    {
      entity: "cart",
      fields: req.queryConfig.fields,
      filters: { id },
    },
    { throwIfKeyNotFound: true }
  );

  res.json({ cart: upatedCart });
}
