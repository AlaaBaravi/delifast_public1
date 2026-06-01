/**
 * Session token check endpoint
 *
 * This route is intentionally called from the embedded frontend with an
 * App Bridge ID token in the Authorization header. It gives Shopify's
 * automated App Store checks clear session-token-authenticated traffic.
 */

import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  return {
    ok: true,
    shop: session.shop,
    authenticatedWithSessionToken: true,
    checkedAt: new Date().toISOString(),
  };
};
