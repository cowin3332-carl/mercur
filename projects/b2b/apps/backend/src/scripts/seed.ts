import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createSellerAccountWorkflow, approveSellerWorkflow, createOffersWorkflow } from "@mercurjs/core/workflows";
import { writeFileSync } from "fs";
import { createUserAccountWorkflow } from "@medusajs/medusa/core-flows";
import seedCatalog from "./seed-catalog";

export default async function seed({ container }: { container: MedusaContainer }) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const { data: existing } = await query.graph({ entity: "product", fields: ["id"] });
  if (!existing.length) await seedCatalog({ container });

  const auth = container.resolve(Modules.AUTH);
  const adminEmail = process.env.DEMO_ADMIN_EMAIL || "admin@example.test";
  const admins = await container.resolve(Modules.USER).listUsers({ email: adminEmail });
  if (!admins.length) {
    const password = process.env.DEMO_ADMIN_PASSWORD;
    if (!password) throw new Error("Run pnpm setup to generate DEMO_ADMIN_PASSWORD");
    const { authIdentity, error } = await auth.register("emailpass", { body: { email: adminEmail, password } });
    if (!authIdentity || error) throw new Error(error || "Cannot create admin identity");
    await createUserAccountWorkflow(container).run({ input: { authIdentityId: authIdentity.id, userData: { email: adminEmail } } });
  }
  const sellerEmail = "supplier@example.test";
  const { data: sellers } = await query.graph({ entity: "seller", fields: ["id"], filters: { email: sellerEmail } });
  let seller = sellers[0];
  if (!seller) {
    const password = process.env.DEMO_SELLER_PASSWORD;
    if (!password) throw new Error("Run pnpm setup to generate DEMO_SELLER_PASSWORD");
    const registration = await auth.register("emailpass", { body: { email: sellerEmail, password } });
    let authId = registration.authIdentity?.id;
    if (!authId) {
      const [identity] = await auth.listProviderIdentities({ entity_id: sellerEmail, provider: "emailpass" });
      authId = identity?.auth_identity_id;
    }
    if (!authId) throw new Error("Cannot create demo supplier identity");
    const { result } = await createSellerAccountWorkflow(container).run({ input: {
      auth_identity_id: authId, member_email: sellerEmail,
      first_name: "Demo", last_name: "Supplier",
      seller: { name: "Demo Supplier", email: sellerEmail, currency_code: "eur" },
    } });
    seller = result;
    await approveSellerWorkflow(container).run({ input: { seller_id: seller.id } });
  }
  const { data: members } = await query.graph({ entity: "member", fields: ["id"], filters: { email: sellerEmail } });
  const fulfillment = container.resolve(Modules.FULFILLMENT);
  const profiles = await fulfillment.listShippingProfiles({ type: "default" });
  const { data: products } = await query.graph({ entity: "product", fields: ["id", "variants.id", "variants.sku", "variants.prices.*"] });
  const { data: existingOffers } = await query.graph({ entity: "offer", fields: ["variant_id"], filters: { seller_id: seller.id } });
  const known = new Set(existingOffers.map((o) => o.variant_id));
  const offers = products.flatMap((product) => product.variants.filter((v) => !known.has(v.id)).map((v) => ({
    seller_id: seller.id, created_by: members[0].id, variant_id: v.id,
    sku: `DEMO-${v.sku || v.id}`, shipping_profile_id: profiles[0].id,
    manage_inventory: false,
    inventory_items: [{ sku: `DEMO-${v.sku || v.id}`, stock_levels: [] }],
    prices: v.prices.map((price) => ({ amount: price.amount, currency_code: price.currency_code })),
  })));
  if (offers.length) await createOffersWorkflow(container).run({ input: { offers } });
  const keys = await container.resolve(Modules.API_KEY).listApiKeys({ type: "publishable" });
  const token = keys[0]?.token;
  if (!token) throw new Error("Publishable API key missing");
  writeFileSync("../../.local-seed.json", JSON.stringify({ publishableKey: token }, null, 2), { mode: 0o600 });
  logger.info(`Seed complete: ${products.length} products, ${offers.length} new offers. Run node scripts/sync-key.mjs.`);
}
