import "@shopify/shopify-api/adapters/node";
import { shopifyApp } from "@shopify/shopify-app-react-router/server";
import { DeliveryMethod, LATEST_API_VERSION } from "@shopify/shopify-api";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

export const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  apiVersion: LATEST_API_VERSION,
  scopes: process.env.SCOPES ? process.env.SCOPES.split(",") : [],
  appUrl: process.env.SHOPIFY_APP_URL,
  authPathPrefix: "/auth",

  sessionStorage: new PrismaSessionStorage(prisma),

  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/app/uninstalled",
    },

    ORDERS_CREATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/orders/create",
    },
    ORDERS_PAID: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/orders/paid",
    },
    ORDERS_UPDATED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/orders/updated",
    },
  },

  hooks: {
    afterAuth: async ({ session }) => {
      // Register webhooks after install/auth
      await shopify.registerWebhooks({ session });
    },
  },

  future: {
    // keep these if you already enabled them
    // (not required for this fix, but safe)
    v3_webhookAdminContext: true,
  },
});

export const authenticate = shopify.authenticate;
