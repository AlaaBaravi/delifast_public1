import { authenticate } from "./shopify.server";

/*
Verifies Shopify webhook using the official Shopify authentication helper.
This automatically validates the HMAC signature.
*/
export async function verifyWebhook(request) {
  try {
    const { topic, shop, payload } = await authenticate.webhook(request);

    return {
      topic,
      shop,
      payload,
      verified: true,
    };
  } catch (error) {
    console.error("Webhook verification failed:", error);

    return {
      verified: false,
      error,
    };
  }
}
