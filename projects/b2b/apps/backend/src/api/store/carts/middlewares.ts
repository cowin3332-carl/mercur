import {
  authenticate,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework";
import { MiddlewareRoute } from "@medusajs/medusa";
import { retrieveCartTransformQueryConfig } from "./query-config";
import { ensureCartMutable } from "../../middlewares/ensure-cart-mutable";
import {
  GetCartLineItemsBulkParams,
  StoreAddLineItemsBulk,
} from "./validators";

export const storeCartsMiddlewares: MiddlewareRoute[] = [
  { method: ["POST", "DELETE"], matcher: "/store/carts/*", middlewares: [ensureCartMutable] },
  {
    method: ["POST"],
    matcher: "/store/carts/:id/line-items/bulk",
    middlewares: [
      validateAndTransformBody(StoreAddLineItemsBulk),
      validateAndTransformQuery(
        GetCartLineItemsBulkParams,
        retrieveCartTransformQueryConfig
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/store/carts/:id/approvals",
    middlewares: [authenticate("customer", ["bearer", "session"])],
  },
];
