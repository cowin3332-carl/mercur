"use server"

import { sdk } from "@/lib/config"

type Offer = {
  id: string
  variant_id: string
  calculated_price?: { calculated_amount?: number | null } | null
}

// V1 uses Mercur's lowest priced offer. A supplier picker can replace this
// without changing the catalog or the B2B quote model.
export async function resolveMercurOffer(
  variantId: string,
  regionId: string,
  headers: Record<string, string>
) {
  const { offers } = await sdk.client.fetch<{ offers: Offer[] }>("/store/offers", {
    query: { variant_id: variantId, region_id: regionId, fields: "+calculated_price", limit: 100 },
    headers,
    cache: "no-store",
  })
  const priced = offers.filter((o) => typeof o.calculated_price?.calculated_amount === "number")
  priced.sort((a, b) => a.calculated_price!.calculated_amount! - b.calculated_price!.calculated_amount!)
  if (!priced[0]) throw new Error("No priced supplier offer is available for this variant")
  return priced[0].id
}
