import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  try {
    const { topic, shop, payload } = await authenticate.webhook(request);

    console.log(`Webhook received: ${topic} from ${shop}`);
    console.log("Payload:", payload);

    const customerId = payload.customer?.id;

    // Example: fetch shipments related to this customer
    const data = await prisma.shipment.findMany({
      where: {
        shop,
        customerId: String(customerId),
      },
    });

    console.log("Customer stored data:", data);

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("WEBHOOK customers/data_request failed:", error);
    return new Response("OK", { status: 200 });
  }
};
