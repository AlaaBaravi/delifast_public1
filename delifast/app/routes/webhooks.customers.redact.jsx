import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  try {
    const { topic, shop, payload } = await authenticate.webhook(request);

    console.log(`Webhook received: ${topic} from ${shop}`);
    console.log("Payload:", payload);

    const customerId = payload.customer?.id;

    await prisma.shipment.deleteMany({
      where: {
        shop,
        customerId: String(customerId),
      },
    });

    console.log("Customer data deleted");

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("WEBHOOK customers/redact failed:", error);
    return new Response("OK", { status: 200 });
  }
};
