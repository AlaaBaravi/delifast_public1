import { authenticate } from "../shopify.server";
import { handleOrderCreated } from "../services/orderHandler.server";

export const action = async ({ request }) => {
  try {

    const { topic, shop, payload, admin } = await authenticate.webhook(request);

    console.log(`Order created webhook received from ${shop}`);

    await handleOrderCreated(shop, payload, admin);

    return new Response("OK", { status: 200 });

  } catch (error) {

    console.error("WEBHOOK orders/create failed:", error);

    // IMPORTANT: always return 200 so Shopify doesn't mark webhook failed
    return new Response("Webhook received but error occurred", { status: 200 });

  }
};
