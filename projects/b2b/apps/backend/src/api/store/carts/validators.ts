import { createSelectParams } from "@medusajs/medusa/api/utils/validators";
import { z } from "@medusajs/framework/zod";

export type GetCartLineItemsBulkParamsType = z.infer<
  typeof GetCartLineItemsBulkParams
>;
export const GetCartLineItemsBulkParams = createSelectParams();

export type StoreAddLineItemsBulkType = z.infer<typeof StoreAddLineItemsBulk>;
export const StoreAddLineItemsBulk = z
  .object({
    line_items: z.array(
      z.object({
        variant_id: z.string(),
        offer_id: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    ),
  })
  .strict();
