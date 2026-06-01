import { authenticate } from "../shopify.server";
import { handleOrderUpdated } from "../services/orderHandler.server";

export const action = async ({ request }) => {
  try {

    const { topic, shop, payload } = await authenticate.webhook(request);

    console.log(`Order updated webhook received from ${shop}`);

    await handleOrderUpdated(shop, payload);

    return new Response("OK", { status: 200 });

  } catch (error) {

    console.error("WEBHOOK orders/updated failed:", error);

    // IMPORTANT: always respond 200 to Shopify
    return new Response("Webhook received but error occurred", { status: 200 });
  }
};
