import shopify from "./shopify.server";

/*
  Shopify mandatory compliance webhooks
  Required for Shopify App Store approval
*/

const mandatoryTopics = [
  "CUSTOMERS_DATA_REQUEST",
  "CUSTOMERS_REDACT",
  "SHOP_REDACT",
];

/*
  Register all webhooks defined in shopify.server.js
*/

export async function registerMandatoryWebhooks(session) {
  try {
    console.log(`[WEBHOOKS] Registering webhooks for ${session.shop}`);

    const responses = await shopify.registerWebhooks({ session });

    Object.entries(responses).forEach(([topic, response]) => {
      if (!response.success) {
        console.error(
          `[WEBHOOK ERROR] Failed to register ${topic}`,
          response
        );
      } else {
        console.log(`[WEBHOOK SUCCESS] ${topic} registered`);
      }
    });

    console.log(`[WEBHOOKS] Registration completed for ${session.shop}`);
  } catch (error) {
    console.error("[WEBHOOKS] Registration failed:", error);
  }
}
