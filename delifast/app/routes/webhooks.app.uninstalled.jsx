import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  try {
    const { topic, shop } = await authenticate.webhook(request);

    console.log(`App uninstalled from ${shop}`);

    // TODO: clean database if needed
    // await prisma.session.deleteMany({ where: { shop } });

  } catch (error) {
    console.error("APP_UNINSTALLED webhook error:", error);
  }

  // Always return 200 so Shopify doesn't retry
  return new Response("OK", { status: 200 });
};
