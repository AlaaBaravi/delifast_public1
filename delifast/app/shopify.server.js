import "@shopify/shopify-app-react-router/adapters/node";

import {
  ApiVersion,
  AppDistribution,
  DeliveryMethod,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";

import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

/*
  Shopify App Initialization
*/

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET_KEY,

apiVersion: ApiVersion.April26,

  scopes: process.env.SCOPES?.split(","),

  appUrl: process.env.SHOPIFY_APP_URL,

  authPathPrefix: "/auth",

  sessionStorage: new PrismaSessionStorage(prisma),

distribution: AppDistribution.Public,

  isEmbeddedApp: true,

  /*
    Register webhooks automatically after install
  */
  hooks: {
    afterAuth: async ({ session }) => {
      try {
        console.log(`Registering webhooks for ${session.shop}`);

        const response = await shopify.registerWebhooks({ session });

        console.log("Webhook registration result:", response);

      } catch (error) {
        console.error("Webhook registration failed:", error);
      }
    },
  },

  /*
    Webhook subscriptions
  */
  webhooks: {
    CUSTOMERS_DATA_REQUEST: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/customers/data_request",
    },

    CUSTOMERS_REDACT: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/customers/redact",
    },

    SHOP_REDACT: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/shop/redact",
    },

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

  /*
    Future Shopify features
  */
  future: {
    expiringOfflineAccessTokens: true,
  },

  /*
    Optional custom domains
  */
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

/*
  Export helpers
*/

export default shopify;

export const apiVersion = ApiVersion.April26;

export const addDocumentResponseHeaders =
  shopify.addDocumentResponseHeaders;

export const authenticate = shopify.authenticate;

export const unauthenticated = shopify.unauthenticated;

export const login = shopify.login;

export const registerWebhooks = shopify.registerWebhooks;

export const sessionStorage = shopify.sessionStorage;
