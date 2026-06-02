/**
 * Application Configuration
 */

import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Environment
  isDev: process.env.NODE_ENV !== 'production',
  
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.SHOPIFY_APP_URL || process.env.HOST || 'http://localhost:3000',
  
  // Shopify
  shopify: {
    apiKey: process.env.SHOPIFY_API_KEY,
    // Render uses SHOPIFY_API_SECRET_KEY (fallback to SHOPIFY_API_SECRET for older envs)
    apiSecret: process.env.SHOPIFY_API_SECRET_KEY || process.env.SHOPIFY_API_SECRET,
    apiVersion: process.env.SHOPIFY_API_VERSION || '2026-04',
    // Render uses SCOPES (fallback to SHOPIFY_SCOPES for older envs)
    scopes: (process.env.SCOPES || process.env.SHOPIFY_SCOPES)?.split(',') || [
      'read_orders',
      'write_orders',
      'read_fulfillments',
      'write_fulfillments',
      'read_customers',
      'write_metafields',
      'read_metafields'
    ],
    appUrl: process.env.SHOPIFY_APP_URL,
    storeDomain: process.env.SHOPIFY_STORE_DOMAIN,
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
  },
  
  // Delifast API
  delifast: {
    baseUrl: 'https://portal.delifast.ae/api',
    endpoints: {
      login: '/Login/Login',
      createShipment: '/Customer/WooCommerceCreateShipment',
      getStatus: '/Customer/WooCommerceShipmentstatue',
      lookupByOrderNumber: '/Customer/LookupOrderShipments',
      lookupShipment: '/Customer/LookupShipmentByOrderNumber',
      getCities: '/Customer/GetCities',
      getAreas: '/Customer/GetAreas',
      cancelShipment: '/Customer/CancelShipment',
      getPaymentMethods: '/Customer/GetPaymentMethods',
    },
    tokenExpiryHours: 24,
    tokenRefreshMinutes: 30, // Refresh 30 min before expiry
  },
  
  // Encryption
  encryptionKey: process.env.ENCRYPTION_KEY || 'default_key_change_in_production',
  
  // Job settings
  jobs: {
    maxLookupAttempts: 24, // Max attempts to find real shipment ID
    lookupIntervalMinutes: 60, // Time between lookup attempts
  }
};
