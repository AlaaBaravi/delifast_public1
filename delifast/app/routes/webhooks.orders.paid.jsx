import { authenticate } from "../shopify.server";
import { handleOrderPaid } from "../services/orderHandler.server";

export const action = async ({ request }) => {
  try {

    const { topic, shop, payload, admin } = await authenticate.webhook(request);

    console.log(`Order paid webhook received from ${shop}`);

    await handleOrderPaid(shop, payload, admin);

    return new Response("OK", { status: 200 });

  } catch (error) {

    console.error("WEBHOOK orders/paid failed:", error);

    // IMPORTANT: Shopify requires 200 response
    return new Response("Webhook received but error occurred", { status: 200 });
  }
};
