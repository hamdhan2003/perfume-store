import express from "express";
import { createOrder,  getAllOrdersAdmin,
    confirmOrderAdmin,returnOrderAdmin,
    shipOrderAdmin,updateOrderPaymentMethod,
    cancelOrderAdmin,getOrderByIdUser,
    getOrderByIdAdmin,createOrderAdmin,payOrderUser, getMyOrders, markOrderReceived,cancelOrderUser 
 } from "../controllers/orderController.js";
 import { protect } from "../middleware/authMiddleware.js";
 import { adminOnly } from "../middleware/adminMiddleware.js";
 
const router = express.Router();

/* PUBLIC — checkout */
router.post("/", protect, createOrder);
/* ADMIN */
router.get("/admin/orders", protect, adminOnly, getAllOrdersAdmin);
router.put("/admin/orders/:id/confirm", protect, adminOnly, confirmOrderAdmin);
router.put("/admin/orders/:id/ship", protect, adminOnly, shipOrderAdmin);
router.put(
    "/admin/orders/:id/cancel",
    protect,
    adminOnly,
    cancelOrderAdmin
  );
  router.put("/:id/pay", protect, payOrderUser);

  router.put(
    "/orders/:id",
    protect,
    updateOrderPaymentMethod
  );
  router.put(
    "/admin/orders/:id/return",
    protect,
    adminOnly,
    returnOrderAdmin
  );
    
  
  router.get(
    "/admin/orders/:id",
    protect,
    adminOnly,
    getOrderByIdAdmin
  );
  router.post(
    "/admin/orders",
    protect,
    adminOnly,
    createOrderAdmin
  );

  // USER ROUTES
  router.get("/my", protect, getMyOrders);
  router.get("/:id", protect, getOrderByIdUser);  
router.put("/:id/received", protect, markOrderReceived);
router.put("/:id/cancel-user", protect, cancelOrderUser);

  
export default router;
