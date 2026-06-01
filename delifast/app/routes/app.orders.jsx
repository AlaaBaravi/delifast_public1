/**
 * Orders Page
 * View and manage orders sent to Delifast
 */

import { useState, useEffect } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";

import {
  getStatusLabel,
  getStatusTone,
} from "../utils/statusMapping";

/*
|--------------------------------------------------------------------------
| SERVER LOADER
|--------------------------------------------------------------------------
*/

export const loader = async ({ request }) => {
  const { authenticate } = await import("../shopify.server");
  const prisma = (await import("../db.server")).default;

  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const page = parseInt(url.searchParams.get("page") || "1", 10);

  const limit = 20;
  const offset = (page - 1) * limit;

  try {

    const where = {
      shop,
      ...(status ? { status } : {}),
    };

    const shipments = await prisma.shipment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    });

    const total = await prisma.shipment.count({ where });

    const [totalCount, newCount, transitCount, completedCount, errorCount] =
      await Promise.all([
        prisma.shipment.count({ where: { shop } }),
        prisma.shipment.count({ where: { shop, status: "new" } }),
        prisma.shipment.count({ where: { shop, status: "in_transit" } }),
        prisma.shipment.count({ where: { shop, status: "completed" } }),
        prisma.shipment.count({ where: { shop, status: "error" } }),
      ]);

    return {
      shipments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),

      statusCounts: {
        all: totalCount,
        new: newCount,
        in_transit: transitCount,
        completed: completedCount,
        error: errorCount,
      },

      currentStatus: status || null,
    };

  } catch (error) {

    console.error("Orders loader error:", error);

    return {
      shipments: [],
      total: 0,
      page: 1,
      limit,
      totalPages: 1,

      statusCounts: {
        all: 0,
        new: 0,
        in_transit: 0,
        completed: 0,
        error: 0,
      },

      currentStatus: null,
    };
  }
};

/*
|--------------------------------------------------------------------------
| SERVER ACTION
|--------------------------------------------------------------------------
*/

export const action = async ({ request }) => {

  const { authenticate } = await import("../shopify.server");

  const {
    refreshOrderStatus,
    updateShipmentId,
  } = await import("../services/orderHandler.server");

  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const actionType = formData.get("_action");
  const orderId = formData.get("orderId");

  try {

    if (actionType === "refresh_status") {

      const result = await refreshOrderStatus(shop, orderId, admin);

      return {
        success: true,
        message: `Status updated: ${getStatusLabel(result.status)}`,
      };
    }

    if (actionType === "update_shipment_id") {

      const newShipmentId = formData.get("shipmentId");

      if (!newShipmentId) {
        return { success: false, message: "Shipment ID is required" };
      }

      await updateShipmentId(shop, orderId, newShipmentId, admin);

      return {
        success: true,
        message: "Shipment ID updated successfully",
      };
    }

    if (actionType === "bulk_refresh") {

      const orderIds = formData.get("orderIds")?.split(",") || [];
      let updated = 0;

      for (const id of orderIds) {
        try {
          await refreshOrderStatus(shop, id, admin);
          updated++;
        } catch {}
      }

      return {
        success: true,
        message: `Refreshed ${updated} of ${orderIds.length} shipments`,
      };
    }

    return { success: false, message: "Unknown action" };

  } catch (error) {

    return {
      success: false,
      message: error?.message || "Something went wrong",
    };
  }
};

/*
|--------------------------------------------------------------------------
| CLIENT COMPONENT
|--------------------------------------------------------------------------
*/

export default function Orders() {

  const {
    shipments,
    total,
    page,
    totalPages,
    statusCounts,
    currentStatus,
  } = useLoaderData();

  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const [selectedOrders, setSelectedOrders] = useState([]);
  const [updateIdModal, setUpdateIdModal] = useState(null);

  const isLoading = fetcher.state !== "idle";
  const actionData = fetcher.data;

  useEffect(() => {

    if (actionData?.success) {
      shopify.toast.show(actionData.message);
      setUpdateIdModal(null);
    }

    if (actionData?.success === false) {
      shopify.toast.show(actionData.message, { isError: true });
    }

  }, [actionData, shopify]);

  const handleRefreshStatus = (orderId) => {

    const form = new FormData();
    form.set("_action", "refresh_status");
    form.set("orderId", orderId);

    fetcher.submit(form, { method: "POST" });
  };

  const toggleOrderSelection = (orderId) => {

    setSelectedOrders((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  };

  const getStatusBadge = (status) => {

    const tone = getStatusTone(status);
    const label = getStatusLabel(status);

    return <s-badge tone={tone}>{label}</s-badge>;
  };

  return (
    <s-page heading="Delifast Orders">

      <s-section>

        {shipments.length === 0 ? (

          <s-empty-state heading="No shipments found">
            <s-paragraph>
              Orders will appear here after they are sent to Delifast.
            </s-paragraph>
          </s-empty-state>

        ) : (

          <s-box>

            <table style={{ width: "100%" }}>

              <thead>
                <tr>
                  <th></th>
                  <th>Order</th>
                  <th>Shipment ID</th>
                  <th>Status</th>
                  <th>Sent</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {shipments.map((shipment) => (

                  <tr key={shipment.id}>

                    <td>
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(
                          shipment.shopifyOrderId
                        )}
                        onChange={() =>
                          toggleOrderSelection(shipment.shopifyOrderId)
                        }
                      />
                    </td>

                    <td>#{shipment.shopifyOrderNumber}</td>

                    <td>{shipment.shipmentId || "-"}</td>

                    <td>{getStatusBadge(shipment.status)}</td>

                    <td>
                      {shipment.sentAt
                        ? new Date(shipment.sentAt).toLocaleDateString()
                        : "-"}
                    </td>

                    <td>
                      <s-button
                        variant="plain"
                        size="slim"
                        onClick={() =>
                          handleRefreshStatus(shipment.shopifyOrderId)
                        }
                        disabled={isLoading}
                      >
                        Refresh
                      </s-button>
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </s-box>

        )}

      </s-section>

    </s-page>
  );
}

/*
|--------------------------------------------------------------------------
| HEADERS
|--------------------------------------------------------------------------
*/

export const headers = async (headersArgs) => {
  const { boundary } = await import("@shopify/shopify-app-react-router/server");
  return boundary.headers(headersArgs);
};
