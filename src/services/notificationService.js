import Notification from "../models/Notification.js";
import { sendAdminEmail, sendUserEmail } from "./emailService.js";
import { sendAdminWhatsApp } from "./whatsappService.js";
import AdminSettings from "../models/AdminSettings.js";
import User from "../models/User.js";

/* ===============================
   ADMIN NOTIFICATION SETTINGS
================================ */
async function getAdminNotificationSettings() {
  const settings = await AdminSettings.findOne();

  // fallback safety (should rarely happen)
  return (
    settings || {
      notificationEmail: "admin@example.com",
      whatsappNumber: "",
      smsNumber: "",
      channels: {
        email: true,
        whatsapp: true,
        sms: false
      }
    }
  );
}

/* ===============================
   MAIN NOTIFICATION HANDLER
================================ */
export async function notifyOrderEvent(event, order, actor) {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const adminSettings = await getAdminNotificationSettings();
  const displayPaymentStatus =
  order.paymentMethod === "online"
    ? "paid"
    : order.paymentStatus;
  /* ===============================
     LOAD FULL USER (FOR EMAIL)
     FIXES: "USER EMAIL SKIPPED"
  ================================ */
  const fullUser =
    order.user && typeof order.user === "object" && order.user.email
      ? order.user
      : await User.findById(order.user).lean();



      function orderCode(order) {
        return `#ORD-${order._id.toString().slice(-6)}`;
      }
  /* ================= ORDER PLACED ================= */
  if (event === "ORDER_PLACED") {
    const adminMsg = `
    Order: #ORD-${order._id.toString().slice(-6)}
    Customer: ${order.customer.name}
    Payment: ${order.paymentMethod} (${displayPaymentStatus})
    `;
    await Notification.create({
      recipientType: "user",
      recipientId: order.user,
      event,
      title: "Order Placed",
      message: `You placed a new order ${orderCode(order)}.`,
      orderId: order._id,
      expiresAt
    });
    await Notification.create({
      recipientType: "admin",
      event,
      title: "New Order Placed",
      message: adminMsg,
      orderId: order._id,
      expiresAt
    });

    if (adminSettings.channels.email && adminSettings.notificationEmail) {
      await sendAdminEmail(
        adminSettings.notificationEmail,
        "New Order Placed",
        adminMsg
      );
    }

    if (adminSettings.channels.whatsapp && adminSettings.whatsappNumber) {
      await sendAdminWhatsApp(
        `To: ${adminSettings.whatsappNumber}\n${adminMsg}`
      );
    }

    await sendUserEmail(
      fullUser,
      "Order Confirmation",
      `Your order #ORD-${order._id.toString().slice(-6)} has been placed.`
    );
  }

  /* ================= CONFIRMED / SHIPPED ================= */
  if (["ORDER_CONFIRMED", "ORDER_SHIPPED"].includes(event)) {
    const status = event.split("_")[1].toLowerCase();
    await Notification.create({
      recipientType: "user",
      recipientId: order.user,
      event,
      title: "Order Update",
      message: `Your order ${orderCode(order)} has been ${status}.`,
      orderId: order._id,
      expiresAt
    });
    await sendUserEmail(
      fullUser,
      `Order ${status}`,
      `Your order #ORD-${order._id.toString().slice(-6)} has been ${status}.`
    );

 
  }

  /* ================= DELIVERED ================= */
  if (event === "ORDER_DELIVERED") {
    if (actor === "user") {

      await Notification.create({
        recipientType: "user",
        recipientId: order.user,
        event,
        title: "Order Delivered",
        message: `Your order ${orderCode(order)} has been delivered.`,
        orderId: order._id,
        expiresAt
      });

      const msg = `
Order Received by Customer
Order: #ORD-${order._id.toString().slice(-6)}
Customer: ${order.customer.name}
`;

      await Notification.create({
        recipientType: "admin",
        event,
        title: "Order Received",
        message: msg,
        orderId: order._id,
        expiresAt
      });

      if (adminSettings.channels.email && adminSettings.notificationEmail) {
        await sendAdminEmail(
          adminSettings.notificationEmail,
          "Order Received",
          msg
        );
      }

      if (adminSettings.channels.whatsapp && adminSettings.whatsappNumber) {
        await sendAdminWhatsApp(
          `To: ${adminSettings.whatsappNumber}\n${msg}`
        );
      }
    } else {
      await sendUserEmail(
        fullUser,
        "Order Delivered",
        `Your order #ORD-${order._id.toString().slice(-6)} has been delivered.`
      );

  
    }
  }

  /* ================= CANCELLED ================= */
  if (event === "ORDER_CANCELLED") {
    if (actor === "user") {

      await Notification.create({
        recipientType: "user",
        recipientId: order.user,
        event,
        title: "Order Cancelled",
        message: `Your order ${orderCode(order)} has been cancelled by admin.`,
        orderId: order._id,
        expiresAt
      });
      const msg = `
Order Cancelled by User
Order: #ORD-${order._id.toString().slice(-6)}
Customer: ${order.customer.name}
`;

      await Notification.create({
        recipientType: "admin",
        event,
        title: "Order Cancelled",
        message: msg,
        orderId: order._id,
        expiresAt
      });

      if (adminSettings.channels.email && adminSettings.notificationEmail) {
        await sendAdminEmail(
          adminSettings.notificationEmail,
          "Order Cancelled",
          msg
        );
      }

      if (adminSettings.channels.whatsapp && adminSettings.whatsappNumber) {
        await sendAdminWhatsApp(
          `To: ${adminSettings.whatsappNumber}\n${msg}`
        );
      }
    } else {
      await sendUserEmail(
        fullUser,
        "Order Cancelled",
        `Your order #ORD-${order._id.toString().slice(-6)} has been cancelled.`
      );

     
    }
  }

  /* ================= RETURNED ================= */
  if (event === "ORDER_RETURNED") {

    await Notification.create({
      recipientType: "user",
      recipientId: order.user,
      event,
      title: "Order Returned",
      message: `Your order ${orderCode(order)} has been returned.`,
      orderId: order._id,
      expiresAt
    });
    await sendUserEmail(
      fullUser,
      "Order Returned",
      `Your order #ORD-${order._id.toString().slice(-6)} has been returned. If payment was made online, it has been refunded or is being processed.`
    );

    
  }
}