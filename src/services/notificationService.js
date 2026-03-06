import Notification from "../models/Notification.js";
import { sendAdminEmail, sendOrderEmail } from "./emailService.js";
import { sendAdminWhatsApp } from "./whatsappService.js";
import { sendUserSMS } from "./smsService.js";
import AdminSettings from "../models/AdminSettings.js";
import User from "../models/User.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "https://perfume-store-frontend-ruby.vercel.app";

async function getAdminNotificationSettings() {
  return (
    (await AdminSettings.findOne()) || {
      notificationEmail: "admin@example.com",
      whatsappNumber: "",
      channels: { email: true, whatsapp: true },
    }
  );
}

// ── Helper: get user email from order (safe, even if unpopulated) ──────────
async function getOrderUserEmail(order) {
  if (order.user) {
    const u = typeof order.user === "object" && order.user.email
      ? order.user
      : await User.findById(order.user).lean();
    return u?.email || null;
  }
  return null;
}

// ── Helper: build order short ID ──────────────────────────────────────────
function shortId(order) {
  return `#ORD-${order._id.toString().slice(-6).toUpperCase()}`;
}

// ── Helper: build item description lines ─────────────────────────────────
function itemLines(order) {
  return order.items
    .map(i => `  - ${i.name} x${i.qty} @ LKR ${i.unitPrice}`)
    .join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
export async function notifyOrderEvent(event, order, actor) {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const adminSettings = await getAdminNotificationSettings();
  const oid = shortId(order);
  const trackingLink = `${FRONTEND_URL}/profile.html`;

  const displayPaymentStatus =
    order.paymentMethod === "online" ? "paid" : order.paymentStatus;

  // ─────────────────────────────────────────────────────────────────────────
  if (event === "ORDER_PLACED") {
    const adminMsg = `New Order ${oid}\nCustomer: ${order.customer.name}\nPhone: ${order.customer.phone}\nPayment: ${order.paymentMethod} (${displayPaymentStatus})\nItems:\n${itemLines(order)}\nTotal: LKR ${order.total}`;

    await Notification.create({
      recipientType: "user",
      recipientId: order.user,
      event,
      title: "Order Placed",
      message: `You placed a new order ${oid}.`,
      orderId: order._id,
      expiresAt,
    });

    await Notification.create({
      recipientType: "admin",
      event,
      title: "New Order Placed",
      message: adminMsg,
      orderId: order._id,
      expiresAt,
    });

    if (adminSettings.channels?.email && adminSettings.notificationEmail) {
      await sendAdminEmail(adminSettings.notificationEmail, `New Order ${oid}`, adminMsg);
    }

    if (adminSettings.channels?.whatsapp && adminSettings.whatsappNumber) {
      await sendAdminWhatsApp(adminMsg);
    }

    // Customer email – order placed confirmation
    const userEmail = await getOrderUserEmail(order);
    if (userEmail) {
      await sendOrderEmail(userEmail, `Order Placed – ${oid}`, {
        orderId: order._id.toString(),
        orderShortId: oid,
        items: order.items,
        total: order.total,
        status: "confirmed",
        trackingLink,
      });
    }

    // Customer SMS — DISABLED (sendUserSMS has early return)
    if (order.customer?.phone) {
      await sendUserSMS(
        order.customer.phone,
        `Hi ${order.customer.name.split(" ")[0]}, your order ${oid} has been placed. Total: LKR ${order.total}. Track at: ${trackingLink}`
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  if (event === "ORDER_CONFIRMED") {
    await Notification.create({
      recipientType: "user",
      recipientId: order.user,
      event,
      title: "Order Confirmed",
      message: `Your order ${oid} has been confirmed.`,
      orderId: order._id,
      expiresAt,
    });

    // Customer email
    const userEmail = await getOrderUserEmail(order);
    if (userEmail) {
      await sendOrderEmail(userEmail, `Your Order is Confirmed – ${oid}`, {
        orderId: order._id.toString(),
        orderShortId: oid,
        items: order.items,
        total: order.total,
        status: "confirmed",
        trackingLink,
      });
    }

    // Admin notification
    if (adminSettings.channels?.email && adminSettings.notificationEmail) {
      await sendAdminEmail(
        adminSettings.notificationEmail,
        `Order Confirmed – ${oid}`,
        `Order ${oid} for ${order.customer.name} has been confirmed.`
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  if (event === "ORDER_SHIPPED") {
    await Notification.create({
      recipientType: "user",
      recipientId: order.user,
      event,
      title: "Order Shipped",
      message: `Your order ${oid} has been shipped and is on its way!`,
      orderId: order._id,
      expiresAt,
    });

    // Customer email
    const userEmail = await getOrderUserEmail(order);
    if (userEmail) {
      await sendOrderEmail(userEmail, `Your Order Has Been Shipped – ${oid}`, {
        orderId: order._id.toString(),
        orderShortId: oid,
        items: order.items,
        total: order.total,
        status: "shipped",
        trackingLink,
      });
    }

    // Customer SMS — DISABLED
    if (order.customer?.phone) {
      await sendUserSMS(
        order.customer.phone,
        `Your order ${oid} has been shipped! Track at: ${trackingLink}`
      );
    }

    if (adminSettings.channels?.whatsapp && adminSettings.whatsappNumber) {
      await sendAdminWhatsApp(`Order ${oid} has been shipped.`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  if (event === "ORDER_DELIVERED") {
    if (actor === "user" || actor === "admin") {
      await Notification.create({
        recipientType: "user",
        recipientId: order.user,
        event,
        title: "Order Delivered",
        message: `Your order ${oid} has been delivered. Thank you for shopping with us!`,
        orderId: order._id,
        expiresAt,
      });

      const actorLabel = actor === "admin" ? "Marked Delivered by Admin" : "Received by Customer";
      const adminMsg = `Order ${actorLabel}\nOrder: ${oid}\nCustomer: ${order.customer.name}`;

      await Notification.create({
        recipientType: "admin",
        event,
        title: "Order Received",
        message: adminMsg,
        orderId: order._id,
        expiresAt,
      });

      if (adminSettings.channels?.email && adminSettings.notificationEmail) {
        await sendAdminEmail(adminSettings.notificationEmail, `Order ${actorLabel}`, adminMsg);
      }

      if (adminSettings.channels?.whatsapp && adminSettings.whatsappNumber) {
        await sendAdminWhatsApp(adminMsg);
      }

      // Customer email
      const userEmail = await getOrderUserEmail(order);
      if (userEmail) {
        await sendOrderEmail(userEmail, `Order Delivered – ${oid}`, {
          orderId: order._id.toString(),
          orderShortId: oid,
          items: order.items,
          total: order.total,
          status: "delivered",
          trackingLink: null,
        });
      }

      // Customer SMS — DISABLED
      if (order.customer?.phone) {
        await sendUserSMS(
          order.customer.phone,
          `Your order ${oid} has been delivered. Thank you for choosing Hirah Attar!`
        );
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  if (event === "ORDER_CANCELLED") {
    if (actor === "user") {
      await Notification.create({
        recipientType: "user",
        recipientId: order.user,
        event,
        title: "Order Cancelled",
        message: `Your order ${oid} has been cancelled.`,
        orderId: order._id,
        expiresAt,
      });

      const msg = `Order Cancelled by User\nOrder: ${oid}\nCustomer: ${order.customer.name}`;

      await Notification.create({
        recipientType: "admin",
        event,
        title: "Order Cancelled",
        message: msg,
        orderId: order._id,
        expiresAt,
      });

      if (adminSettings.channels?.email && adminSettings.notificationEmail) {
        await sendAdminEmail(adminSettings.notificationEmail, "Order Cancelled by User", msg);
      }

      if (adminSettings.channels?.whatsapp && adminSettings.whatsappNumber) {
        await sendAdminWhatsApp(msg);
      }
    } else {
      // Admin cancelled → notify user
      const userEmail = await getOrderUserEmail(order);

      await Notification.create({
        recipientType: "user",
        recipientId: order.user,
        event,
        title: "Order Cancelled",
        message: `Your order ${oid} has been cancelled by our team. Contact us if you have questions.`,
        orderId: order._id,
        expiresAt,
      });

      if (userEmail) {
        await sendOrderEmail(userEmail, `Your Order Has Been Cancelled – ${oid}`, {
          orderId: order._id.toString(),
          orderShortId: oid,
          items: order.items,
          total: order.total,
          status: "cancelled",
          trackingLink: null,
        });
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  if (event === "ORDER_RETURNED") {
    await Notification.create({
      recipientType: "user",
      recipientId: order.user,
      event,
      title: "Order Returned",
      message: `Your order ${oid} has been returned.`,
      orderId: order._id,
      expiresAt,
    });

    // Customer email
    const userEmail = await getOrderUserEmail(order);
    if (userEmail) {
      await sendOrderEmail(userEmail, `Order Return Processed – ${oid}`, {
        orderId: order._id.toString(),
        orderShortId: oid,
        items: order.items,
        total: order.total,
        status: "returned",
        trackingLink: null,
      });
    }

    // Admin notification
    const adminMsg = `Order Returned\nOrder: ${oid}\nCustomer: ${order.customer.name}`;
    await Notification.create({
      recipientType: "admin",
      event,
      title: "Order Returned",
      message: adminMsg,
      orderId: order._id,
      expiresAt,
    });

    if (adminSettings.channels?.email && adminSettings.notificationEmail) {
      await sendAdminEmail(adminSettings.notificationEmail, `Order Returned – ${oid}`, adminMsg);
    }
  }
}