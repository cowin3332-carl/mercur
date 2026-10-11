import { QUOTE_MODULE } from "./src/modules/quote";
import { APPROVAL_MODULE } from "./src/modules/approval";
import { COMPANY_MODULE } from "./src/modules/company";
import { loadEnv } from "@medusajs/framework/utils";
import { withMercur } from "@mercurjs/core";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

module.exports = withMercur({
  admin: { disable: process.env.DISABLE_ADMIN === "true" },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
  },
  modules: [
    { resolve: "./src/modules/company" },
    { resolve: "./src/modules/quote" },
    { resolve: "./src/modules/approval" },
  ],
});
