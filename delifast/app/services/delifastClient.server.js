/**
 * Delifast API Client
 * Handles all communication with Delifast API
 */

import { config } from "./config.server";
import { logger } from "./logger.server";
import { ensureValidToken, login, clearToken } from "./tokenManager.server";
import { extractStatusFromResponse, isTemporaryId } from "../utils/statusMapping";

/*
|--------------------------------------------------------------------------
| INTERNAL REQUEST HELPER
|--------------------------------------------------------------------------
*/

async function makeRequest(shop, method, endpoint, data = null, params = null) {
  const token = await ensureValidToken(shop);
  let url = `${config.delifast.baseUrl}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const requestConfig = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "Accept-Language": "en-US",
    },
  };

  if (data) {
    requestConfig.body = JSON.stringify(data);
  }

  logger.debug("Delifast API request", { method, endpoint }, shop);

  try {
    const response = await fetch(url, requestConfig);
    const responseData = await response.json();

    if (!response.ok) {

      // Retry if token expired
      if (response.status === 401) {
        logger.info("Token expired, refreshing token", null, shop);

        await clearToken(shop);
        const newToken = await login(shop);

        requestConfig.headers.Authorization = `Bearer ${newToken}`;
        const retryResponse = await fetch(url, requestConfig);

        return retryResponse.json();
      }

      throw new Error(`API error ${response.status}`);
    }

    return responseData;

  } catch (error) {
    logger.error("Delifast API error", { error: error.message, endpoint }, shop);
    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| CREATE SHIPMENT
|--------------------------------------------------------------------------
*/

export async function createShipment(shop, orderData) {
  logger.info("Creating shipment", { orderRef: orderData.billing_ref }, shop);

  const result = await makeRequest(
    shop,
    "POST",
    config.delifast.endpoints.createShipment,
    orderData
  );

  const shipmentId = extractShipmentId(result);

  if (shipmentId) {
    logger.info("Shipment created successfully", { shipmentId }, shop);

    return {
      success: true,
      shipmentId,
      isTemporary: isTemporaryId(shipmentId),
      raw: result,
    };
  }

  if (result.success === true) {
    return {
      success: true,
      shipmentId: null,
      needsLookup: true,
      raw: result,
    };
  }

  throw new Error(result.message || "Shipment creation failed");
}

/*
|--------------------------------------------------------------------------
| GET SHIPMENT STATUS
|--------------------------------------------------------------------------
*/

export async function getShipmentStatus(shop, shipmentNo) {
  if (isTemporaryId(shipmentNo)) {
    return {
      status: "new",
      statusDetails: "Awaiting real shipment ID",
      isTemporary: true,
    };
  }

  logger.info("Checking shipment status", { shipmentNo }, shop);

  const result = await makeRequest(
    shop,
    "POST",
    config.delifast.endpoints.getStatus,
    { ShNo: shipmentNo }
  );

  const simplifiedStatus = extractStatusFromResponse(result);

  return {
    status: simplifiedStatus,
    statusDetails: result.statusDetails || result.StatusDetails || null,
    raw: result,
    success: true,
  };
}

/*
|--------------------------------------------------------------------------
| LOOKUP SHIPMENT BY ORDER NUMBER
|--------------------------------------------------------------------------
*/

export async function lookupByOrderNumber(shop, orderNumber) {
  logger.info("Looking up shipment by order number", { orderNumber }, shop);

  try {
    const result = await makeRequest(
      shop,
      "POST",
      config.delifast.endpoints.lookupByOrderNumber,
      { OrderNumber: orderNumber }
    );

    return extractShipmentId(result);

  } catch (error) {
    logger.error("Lookup failed", { orderNumber }, shop);
    return null;
  }
}

/*
|--------------------------------------------------------------------------
| GET SHIPMENTS LIST (FIX FOR YOUR ERROR)
|--------------------------------------------------------------------------
*/

export async function getShipments(shop) {
  logger.info("Fetching shipments list", null, shop);

  const result = await makeRequest(
    shop,
    "GET",
    config.delifast.endpoints.getShipments
  );

  if (!result) return [];

  if (Array.isArray(result)) {
    return result;
  }

  return result.shipments || result.data || [];
}

/*
|--------------------------------------------------------------------------
| GET CITIES
|--------------------------------------------------------------------------
*/

export async function getCities(shop) {
  const result = await makeRequest(
    shop,
    "GET",
    config.delifast.endpoints.getCities
  );

  return Array.isArray(result) ? result : result.cities || [];
}

/*
|--------------------------------------------------------------------------
| GET AREAS
|--------------------------------------------------------------------------
*/

export async function getAreas(shop, cityId) {
  const result = await makeRequest(
    shop,
    "GET",
    config.delifast.endpoints.getAreas,
    null,
    { cityId }
  );

  return Array.isArray(result) ? result : result.areas || [];
}

/*
|--------------------------------------------------------------------------
| CANCEL SHIPMENT
|--------------------------------------------------------------------------
*/

export async function cancelShipment(shop, shipmentNo) {
  logger.info("Cancelling shipment", { shipmentNo }, shop);

  return makeRequest(
    shop,
    "POST",
    config.delifast.endpoints.cancelShipment,
    { ShipmentNo: shipmentNo }
  );
}

/*
|--------------------------------------------------------------------------
| TEST CONNECTION
|--------------------------------------------------------------------------
*/

export async function testConnection(shop) {
  logger.info("Testing Delifast API connection", null, shop);

  const token = await login(shop);

  return {
    success: true,
    hasToken: !!token,
  };
}

/*
|--------------------------------------------------------------------------
| SHIPMENT ID EXTRACTION
|--------------------------------------------------------------------------
*/

function extractShipmentId(response) {
  if (!response) return null;

  const fields = [
    "shipmentId",
    "ShipmentId",
    "shipmentNo",
    "ShipmentNo",
    "trackingNumber",
    "TrackingNumber",
    "id",
  ];

  for (const field of fields) {
    if (response[field]) {
      return String(response[field]);
    }
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| EXPORT CLIENT
|--------------------------------------------------------------------------
*/

export const delifastClient = {
  createShipment,
  getShipmentStatus,
  lookupByOrderNumber,
  getShipments,
  getCities,
  getAreas,
  cancelShipment,
  testConnection,
};
