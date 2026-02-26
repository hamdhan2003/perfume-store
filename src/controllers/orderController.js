import Order from "../models/Order.js";
import Product from "../models/Product.js";
import mongoose from "mongoose";
import { calculateLoyaltyTier } from "../utils/loyaltyCalculator.js";
import User from "../models/User.js";
import { notifyOrderEvent } from "../services/notificationService.js";



/* ================= CREATE ORDER ================= */
export const createOrder = async (req, res) => {
  try {
    const {
      items,
      subtotal,
      deliveryCharge,
      total,
      customer,
      loyaltyTier = null,
      loyaltyDiscount = 0
    } = req.body;

    if (
      !items?.length ||
      !customer?.name ||
      !customer?.phone ||
      !customer?.address
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required order data"
      });
    }

    // ✅ USER MUST EXIST (because route is protected)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Login required to place order"
      });
    }

    // ================= LOYALTY SNAPSHOT (SERVER AUTHORITY) =================
    const user = await User.findById(req.user._id).lean();

    let finalLoyaltyTier = "bronze";
    let loyaltyPercent = 0;
    let finalLoyaltyDiscount = 0;

    if (user) {
      finalLoyaltyTier = user.loyaltyTier || "bronze";

      const map = {
        bronze: 0,
        silver: 1,
        gold: 3.5,
        platinum: 7,
        diamond: 14
      };

      loyaltyPercent = map[finalLoyaltyTier] ?? 0;
      finalLoyaltyDiscount = Number(
        ((subtotal * loyaltyPercent) / 100).toFixed(2)
      );
    }

    const reviewQueue = items.map(i => ({
      productId: i.productId,
      reviewed: false,
      skipped: false,
      reviewedAt: null
    }));

    const order = await Order.create({
      user: req.user._id,
      source: "website",

      paymentMethod:
        req.body.paymentMethod === "cash"
          ? "cash"
          : req.body.paymentMethod === "online"
          ? "online"
          : null,

      items: items.map(i => ({
        productId: i.productId,
        name: i.name,
        size: i.size,
        qty: i.qty,
        unitPrice: i.unitPrice,
        variant: i.variant,
        image: i.image || ""   // ⭐ SAVE IMAGE
      })),

      subtotal,

      deliveryCharge,
      total: subtotal + deliveryCharge - finalLoyaltyDiscount,

      // ================= LOYALTY SNAPSHOT =================
      loyalty: {
        tier: finalLoyaltyTier,
        percent: loyaltyPercent,
        discount: finalLoyaltyDiscount
      },

      customer,

      reviewQueue,
      paymentStatus: "unpaid",
      orderStatus: "pending"
    });

    // 🔔 NOTIFICATION (SAFE ADDITION)
    // User placed order → notify admin (in-app + email + WhatsApp) & user (email)
    notifyOrderEvent("ORDER_PLACED", order, "user")
    .catch(err => console.error("NOTIFICATION ERROR:", err));
    res.status(201).json({
      success: true,
      orderId: order._id
    });

  } catch (err) {
    console.error("CREATE ORDER ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create order"
    });
  }
};


/* ================= USER: UPDATE PAYMENT METHOD ================= */
export const updateOrderPaymentMethod = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Ensure user owns the order
    if (!order.user || order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized"
      });
    }

    // Block changes if already processed
    if (["cancelled", "shipped", "delivered"].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "Order can no longer be modified"
      });
    }

    const { paymentMethod } = req.body;

    // Only allow valid transitions
    if (paymentMethod === "cash" || paymentMethod === "online") {
      order.paymentMethod = paymentMethod;
      order.paymentStatus = "unpaid";
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method"
      });
    }

    await order.save();

    res.json({ success: true, orderId: order._id });

  } catch (err) {
    console.error("UPDATE PAYMENT METHOD ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update payment method"
    });
  }
};


export const getAllOrdersAdmin = async (req, res) => {
  try {
    const orders = await Order.find()
    .populate("user", "name email avatar")
    .sort({ createdAt: -1 })
      .lean();

    const tableOrders = orders.map(o => ({
      _id: o._id,
      id: "#ORD-" + o._id.toString().slice(-6).toUpperCase(),
      createdAt: o.createdAt,
      total: o.total,
      paymentStatus: o.paymentStatus,
      orderStatus: o.orderStatus,
      paymentMethod: o.paymentMethod, // ✅ ADD THIS

      customer: {
        name: o.customer?.name || o.user?.name || "-",
        email: o.user?.email || null,
        avatar: o.user?.avatar || null
      }
      
    }));

    res.json({ success: true, orders: tableOrders });

  } catch (err) {
    console.error("ADMIN GET ORDERS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load orders"
    });
  }
};


/* ================= ADMIN: GET SINGLE ORDER ================= */
export const getOrderByIdAdmin = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    .populate("user", "name email avatar")
    .populate("items.productId", "name")
    .lean();
  

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const fullOrder = {
      _id: order._id,
      id: "#ORD-" + order._id.toString().slice(-6).toUpperCase(),

      createdAt: order.createdAt,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      
      subtotal: order.subtotal,
      deliveryCharge: order.deliveryCharge,
      total: order.total,
      loyalty: order.loyalty
      ? {
          tier: order.loyalty.tier,
          discount: order.loyalty.discount
        }
      : null,
      customer: {
        name: order.customer?.name || "-",
        phone: order.customer?.phone || "-",
        address: order.customer?.address || "-",
        district: order.customer?.district || "-",  
        province: order.customer?.province || "-",
        city: order.customer?.city || "-",    // ✅ ADD
        postalCode: order.customer?.postalCode || "-",  // ✅ ADD
        email: order.user?.email || null,
        accountName: order.user?.name || null ,  // optional, for admin UI later
        avatar: order.user?.avatar || null   // ✅ ADD THIS

      },
      

     

      items: order.items.map(i => ({
        name: i.name,
        size: i.size,
        qty: i.qty,
        unitPrice: i.unitPrice
      }))
    };

    res.json({ success: true, order: fullOrder });
  } catch (err) {
    console.error("ADMIN GET ORDER ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load order"
    });
  }
};


/* ================= ADMIN: CONFIRM ORDER ================= */
export const confirmOrderAdmin = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    // ✅ ONLINE orders must be paid
    if (order.paymentMethod === "online" && order.paymentStatus !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Online order must be paid before confirmation"
      });
    }

    // ❌ Prevent re-processing
    if (order.orderStatus !== "pending")
      return res.status(400).json({
        success: false,
        message: "Order already processed"
      });

    /* 🔻 STOCK DEDUCTION (UNCHANGED, SAFE) */
    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (!product) continue;

      const sizeMl = Number(item.size.replace("ml", ""));
      const bottle = product.bottleSizes.find(b => b.sizeMl === sizeMl);

      if (!bottle || bottle.stock < item.qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name} (${item.size})`
        });
      }

      bottle.stock -= item.qty;
      product.inventoryQty -= item.qty;

      await product.save();
    }

    order.orderStatus = "confirmed";
    await order.save();
// 🔔 NOTIFICATION: ADMIN CONFIRMED ORDER
await notifyOrderEvent("ORDER_CONFIRMED", order, "admin");

    res.json({ success: true });
  } catch (err) {
    console.error("ADMIN CONFIRM ORDER ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to confirm order" });
  }
};


/* ================= ADMIN: SHIP ORDER ================= */
export const shipOrderAdmin = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    if (order.orderStatus !== "confirmed")
      return res.status(400).json({ success: false, message: "Order not confirmed yet" });

    order.orderStatus = "shipped";
    await order.save();
// 🔔 NOTIFICATION: ADMIN SHIPPED ORDER
await notifyOrderEvent("ORDER_SHIPPED", order, "admin");
    res.json({ success: true });
  } catch (err) {
    console.error("ADMIN SHIP ORDER ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to ship order" });
  }
};

/* ================= ADMIN: CANCEL ORDER ================= */
/* ================= ADMIN: CANCEL ORDER ================= */
export const cancelOrderAdmin = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // ✅ If already cancelled → return SUCCESS (not error)
    if (order.orderStatus === "cancelled") {
      return res.json({
        success: true,
        order,
        message: "Order already cancelled"
      });
    }

    /* 🔄 RESTORE STOCK (only if stock was deducted) */
    if (order.orderStatus !== "pending") {
      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        if (!product) continue;

        const sizeMl = Number(item.size.replace("ml", ""));
        const bottle = product.bottleSizes.find(b => b.sizeMl === sizeMl);

        if (bottle) bottle.stock += item.qty;
        product.inventoryQty += item.qty;

        await product.save();
      }
    }

    /* 💰 REFUND (LOGICAL ONLY) */
    if (order.paymentStatus === "paid") {
      order.paymentStatus = "refunded";
    }

    order.orderStatus = "cancelled";
    await order.save();

    // 🔔 NOTIFICATION
    await notifyOrderEvent("ORDER_CANCELLED", order, "admin");

    res.json({
      success: true,
      order,
      message: "Order cancelled successfully"
    });

  } catch (err) {
    console.error("ADMIN CANCEL ORDER ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to cancel order"
    });
  }
};

// ================= USER: GET SINGLE ORDER =================
export const getOrderByIdUser = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id
    })
      .populate("items.productId", "images")
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const BASE_URL = `${req.protocol}://${req.get("host")}`;

    order.items = order.items.map(item => {
      let image = "";

      if (
        item.productId &&
        Array.isArray(item.productId.images) &&
        item.productId.images.length > 0
      ) {
        image = item.productId.images[0];

        // 🔥 ABSOLUTE URL (FINAL FIX)
        if (!image.startsWith("http")) {
// always return RELATIVE path (same as cart flow)
if (image.startsWith("http")) {
  image = image.replace(/^https?:\/\/[^/]+\/?/i, "");
}

if (image.startsWith("/")) {
  image = image.slice(1);
}
        }
      }

      return {
        productId: item.productId._id,
        name: item.name,
        size: item.size,
        qty: item.qty,
        price: item.unitPrice,
        variant: item.variant,
        image
      };
    });

    res.json({ success: true, order });

  } catch (err) {
    console.error("USER GET ORDER ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load order"
    });
  }
};







/* ================= ADMIN: MANUAL CREATE ORDER ================= */
export const createOrderAdmin = async (req, res) => {
  try {
    const { customer, items, notes } = req.body;

    if (
      !customer?.name ||
      !customer?.phone ||
      !customer?.address ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid order data"
      });
    }

    // ✅ FIX: inject dummy productId for manual items
    const normalizedItems = items.map(item => ({
      productId: new mongoose.Types.ObjectId(), // <-- KEY FIX
      name: item.name,
      size: item.size || "manual",
      qty: Number(item.qty),
      unitPrice: Number(item.unitPrice),
      variant: "manual"
    }));

    // 🔢 totals
    const subtotal = normalizedItems.reduce(
      (sum, i) => sum + i.unitPrice * i.qty,
      0
    );

    const shipping = 0;
    const taxes = 0;
    const total = subtotal;

    const order = await Order.create({
      user: null,                 // 🔥 MANUAL ORDER = NO USER
      source: "admin",            // 🔥 ADMIN ORDER
      paymentMethod: "manual",
    
      items: normalizedItems,
      subtotal,
      shipping,
      taxes,
      total,
    
      customer: {
        name: customer.name,
        phone: customer.phone,
        address: customer.address
      },
    
      delivery: {
        speed: "standard",
        days: 3,
        charge: 0
      },
    
      paymentStatus: "paid",      // manual orders are paid
      orderStatus: "pending",
      notes: notes || ""
    });
    

    res.status(201).json({
      success: true,
      orderId: order._id
    });

  } catch (err) {
    console.error("ADMIN CREATE ORDER ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create order"
    });
  }
};


export const payOrderUser = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    // 🔥 Ensure user owns this order
    if (!order.user || order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    if (order.paymentStatus === "paid") {
      return res.json({ success: true, message: "Already paid" });
    }

 // paymentMethod MUST already be chosen by frontend
if (order.paymentMethod === "online") {
  order.paymentStatus = "paid";
}

if (order.paymentMethod === "cash") {
  order.paymentStatus = "unpaid"; // COD is unpaid until delivery
}

await order.save();


    res.json({ success: true });

  } catch (err) {
    console.error("PAY ORDER ERROR:", err);
    res.status(500).json({ success: false, message: "Payment failed" });
  }
};


// ===============================
// GET LOGGED-IN USER ORDERS
// ===============================
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      user: req.user._id,
      source: "website"
    })
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });

  } catch (err) {
    console.error("GET MY ORDERS ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to load orders" });
  }
};


// ===============================
// USER MARK ORDER AS RECEIVED
// ===============================
export const markOrderReceived = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order)
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });

    // ===============================
    // AUTHORIZE: USER OR ADMIN
    // ===============================
    const isOwner =
      order.user &&
      order.user.toString() === req.user._id.toString();

    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized"
      });
    }

    if (order.orderStatus !== "shipped") {
      return res.json({
        success: false,
        message: "Order not shipped yet"
      });
    }

    // ===============================
    // SOLD COUNT APPLY (ONCE)
    // ===============================
    if (!order._soldCountApplied) {
      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        if (!product) continue;

        product.soldCount += Number(item.qty) || 0;
        await product.save();
      }

      order._soldCountApplied = true;
    }

    // ===============================
    // CREATE REVIEW QUEUE (ONLY ONCE)
    // ===============================
    if (!Array.isArray(order.reviewQueue) || order.reviewQueue.length === 0) {
      order.reviewQueue = order.items.map(item => ({
        productId: item.productId,
        reviewed: false,
        skipped: false,
        reviewedAt: null
      }));
    }

    // ===============================
    // MARK AS DELIVERED
    // ===============================
    order.orderStatus = "delivered";

    // ===============================
    // COD: MARK AS PAID ON DELIVERY
    // ===============================
    if (order.paymentMethod === "cash" && order.paymentStatus !== "paid") {
      order.paymentStatus = "paid";
    }

    await order.save();

    // ===============================
    // NOTIFICATION
    // ===============================
    const actor = isAdmin ? "admin" : "user";
    await notifyOrderEvent("ORDER_DELIVERED", order, actor);

    // ===============================
    // LOYALTY AUTO UPDATE (SAFE)
    // ===============================
    try {
      const user = await User.findById(order.user);
      if (user && user.loyaltyMode === "auto") {
        const newTier = await calculateLoyaltyTier(user);

        if (newTier && newTier !== user.loyaltyTier) {
          user.loyaltyTier = newTier;
          await user.save();
        }
      }
    } catch (err) {
      console.error("LOYALTY UPDATE ERROR:", err);
      // ❌ Do NOT block order completion
    }

    res.json({
      success: true,
      reviewQueue: order.reviewQueue
    });

  } catch (err) {
    console.error("MARK RECEIVED ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update order"
    });
  }
};



// ===============================
// USER CANCEL ORDER
// ===============================
export const cancelOrderUser = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    // Ensure user owns order
    if (!order.user || order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // Block cancel if shipped or delivered
    if (["shipped", "delivered", "cancelled"].includes(order.orderStatus)) {
      return res.json({
        success: false,
        message: "Order can no longer be cancelled"
      });
    }

    // ===============================
    // RESTORE STOCK
    // ===============================
    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (!product) continue;
    
      const sizeMl = Number(item.size.replace("ml", ""));
      const bottle = product.bottleSizes.find(b => b.sizeMl === sizeMl);
    
      if (bottle) {
        bottle.stock += item.qty;
        product.inventoryQty += item.qty;
      }
    
      await product.save();
    }
    
    // ===============================
    // FAKE REFUND
    // ===============================
    if (order.paymentStatus === "paid") {
      order.paymentStatus = "refunded";

      // Future: log refund transaction
      // paymentHistory.push(...)
    }

    order.orderStatus = "cancelled";
    await order.save();
// 🔔 NOTIFICATION: USER CANCELLED ORDER
await notifyOrderEvent("ORDER_CANCELLED", order, "user");
    res.json({ success: true });

  } catch (err) {
    console.error("USER CANCEL ERROR:", err);
    res.status(500).json({ success: false, message: "Cancel failed" });
  }
};



/* ================= ADMIN: RETURN ORDER ================= */
export const returnOrderAdmin = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Only shipped orders can be returned
    if (order.orderStatus !== "shipped") {
      return res.status(400).json({
        success: false,
        message: "Only shipped orders can be returned"
      });
    }

    // 🔄 RESTORE STOCK
    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (!product) continue;

      const sizeMl = Number(item.size.replace("ml", ""));
      const bottle = product.bottleSizes.find(b => b.sizeMl === sizeMl);

      if (bottle) bottle.stock += item.qty;
      product.inventoryQty += item.qty;

      await product.save();
    }

    // 💰 REFUND STATE (ONLINE ONLY)
    if (order.paymentMethod === "online" && order.paymentStatus === "paid") {
      order.paymentStatus = "refunded";

      // TODO: integrate real payment gateway refund here
    }

    order.orderStatus = "returned";
    await order.save();
// 🔔 NOTIFICATION: ADMIN RETURNED ORDER
await notifyOrderEvent("ORDER_RETURNED", order, "admin");
    res.json({ success: true });

  } catch (err) {
    console.error("ADMIN RETURN ORDER ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to return order" });
  }
};
