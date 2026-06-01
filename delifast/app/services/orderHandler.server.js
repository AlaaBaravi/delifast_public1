/**
 * Order Handler Service
 * Handles order events and Delifast integration
 */

import prisma from "../db.server";
import { logger } from "./logger.server";
import { delifastClient } from "./delifastClient.server";
import { prepareOrderDataForDelifast, shouldAutoSend } from "./orderMapper.server";
import {
  getShopifyTag,
  generateTemporaryId,
  isTemporaryId
} from "../utils/statusMapping";

/**
 * Handle order created webhook
 */
export async function handleOrderCreated(shop, order, admin) {
  logger.info('Processing order created', {
    orderId: order.id,
    orderNumber: order.name
  }, shop);

  if (await shouldAutoSend(shop, order, 'created')) {
    await sendOrderToDelifast(shop, order, admin);
  }
}

/**
 * Handle order paid webhook
 */
export async function handleOrderPaid(shop, order, admin) {
  logger.info('Processing order paid', {
    orderId: order.id,
    orderNumber: order.name
  }, shop);

  const existing = await prisma.shipment.findUnique({
    where: {
      shop_shopifyOrderId: {
        shop,
        shopifyOrderId: String(order.id),
      },
    },
  });

  if (existing?.shipmentId) {
    logger.debug('Order already sent to Delifast', {
      orderId: order.id,
      shipmentId: existing.shipmentId
    }, shop);
    return;
  }

  if (await shouldAutoSend(shop, order, 'paid')) {
    await sendOrderToDelifast(shop, order, admin);
  }
}

/**
 * Handle order updated webhook
 */
export async function handleOrderUpdated(shop, order) {
  logger.debug('Order updated', { orderId: order.id }, shop);
}

/**
 * Send order to Delifast
 */
export async function sendOrderToDelifast(shop, order, admin = null) {

  const orderId = String(order.id);

  // 🔧 FIX: always force string
  const orderNumber = String(order.order_number || order.name || orderId);

  logger.info('Sending order to Delifast', { orderId, orderNumber }, shop);

  try {

    const orderData = await prepareOrderDataForDelifast(shop, order);

    const result = await delifastClient.createShipment(shop, orderData);

    let shipmentId = result.shipmentId;
    let isTemporary = false;

    if (!shipmentId || result.needsLookup) {
      shipmentId = generateTemporaryId(orderNumber);
      isTemporary = true;
    }

    await prisma.shipment.upsert({
      where: {
        shop_shopifyOrderId: {
          shop,
          shopifyOrderId: orderId,
        },
      },
      update: {
        shipmentId,
        isTemporaryId: isTemporary,
        status: 'new',
        statusDetails: isTemporary ? 'Awaiting real shipment ID' : 'Shipment created',
        sentAt: new Date(),
        nextLookupAt: isTemporary ? new Date(Date.now() + 15 * 60 * 1000) : null,
      },
      create: {
        shop,
        shopifyOrderId: orderId,
        shopifyOrderNumber: orderNumber,
        shipmentId,
        isTemporaryId: isTemporary,
        status: 'new',
        statusDetails: isTemporary ? 'Awaiting real shipment ID' : 'Shipment created',
        nextLookupAt: isTemporary ? new Date(Date.now() + 15 * 60 * 1000) : null,
      },
    });

    if (admin) {
      try {

        await admin.graphql(
          `#graphql
          mutation updateOrderMetafields($input: OrderInput!) {
            orderUpdate(input: $input) {
              order { id }
              userErrors { field message }
            }
          }`,
          {
            variables: {
              input: {
                id: `gid://shopify/Order/${orderId}`,
                metafields: [
                  {
                    namespace: 'delifast',
                    key: 'shipment_id',
                    value: shipmentId,
                    type: 'single_line_text_field',
                  },
                  {
                    namespace: 'delifast',
                    key: 'status',
                    value: 'new',
                    type: 'single_line_text_field',
                  },
                  {
                    namespace: 'delifast',
                    key: 'is_temporary',
                    value: String(isTemporary),
                    type: 'single_line_text_field',
                  },
                ],
              },
            },
          }
        );

        await admin.graphql(
          `#graphql
          mutation addOrderTags($id: ID!, $tags: [String!]!) {
            tagsAdd(id: $id, tags: $tags) {
              node { ... on Order { id tags } }
              userErrors { field message }
            }
          }`,
          {
            variables: {
              id: `gid://shopify/Order/${orderId}`,
              tags: [getShopifyTag('new'), 'delifast-sent'],
            },
          }
        );

        logger.debug('Updated Shopify order', { orderId }, shop);

      } catch (shopifyError) {

        logger.warning('Failed to update Shopify order', {
          error: shopifyError.message,
          orderId
        }, shop);

      }
    }

    logger.info('Order sent to Delifast successfully', {
      orderId,
      shipmentId,
      isTemporary
    }, shop);

    return {
      success: true,
      shipmentId,
      isTemporary,
    };

  } catch (error) {

    logger.error('Failed to send order to Delifast', {
      orderId,
      error: error.message
    }, shop);

    await prisma.shipment.upsert({
      where: {
        shop_shopifyOrderId: {
          shop,
          shopifyOrderId: orderId,
        },
      },
      update: {
        status: 'error',
        statusDetails: error.message,
      },
      create: {
        shop,
        shopifyOrderId: orderId,
        shopifyOrderNumber: orderNumber,
        status: 'error',
        statusDetails: error.message,
      },
    });

    throw error;
  }
}
