import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  try {

    const { payload, session, topic, shop } = await authenticate.webhook(request);

    console.log(`Received ${topic} webhook for ${shop}`);

    const current = payload.current;

    if (session && current) {
      await db.session.update({
        where: {
          id: session.id,
        },
        data: {
          scope: current.toString(),
        },
      });
    }

  } catch (error) {

    console.error("APP_SCOPES_UPDATE webhook error:", error);

  }

  // Always return 200 so Shopify does not retry
  return new Response("OK", { status: 200 });
};
