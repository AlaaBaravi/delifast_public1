import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  try {
    const { topic, shop, payload } = await authenticate.webhook(request);

    console.log(`Webhook received: ${topic} from ${shop}`);
    console.log("Payload:", payload);

    await prisma.storeSettings.deleteMany({
      where: { shop },
    });

    await prisma.shipment.deleteMany({
      where: { shop },
    });

    console.log("Store data deleted");

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("WEBHOOK shop/redact failed:", error);
    return new Response("OK", { status: 200 });
  }
};
