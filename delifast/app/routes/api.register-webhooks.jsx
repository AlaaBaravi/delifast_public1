import { registerWebhooks, sessionStorage } from "../shopify.server";

export const loader = async () => {

  const sessions = await sessionStorage.findSessionsByShop(
    "delifast-dev.myshopify.com"
  );

  if (!sessions.length) {
    console.log("NO SESSION FOUND");
    return new Response("no session");
  }

  const session = sessions[0];

  await registerWebhooks({ session });

  console.log("WEBHOOKS REGISTERED");

  return new Response("registered");
};
