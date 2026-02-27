// ================= adminRoutes.js (CLOUDINARY FIXED) =================
import express from "express";

import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";
import upload from "../middleware/upload.js"; // ✅ Cloudinary

import {
  getAllUsers,
  getAdminStats,

  createProduct,
  getAllProductsAdmin,
  updateProduct,
  toggleProductStatus,
  deleteProduct,
  uploadProductImage,
  updateProductStock,
  createUserByAdmin
} from "../controllers/adminController.js";

const router = express.Router();

/* ================= USERS ================= */
router.get("/users", protect, adminOnly, getAllUsers);
router.post("/users", protect, adminOnly, createUserByAdmin);

/* ================= STATS ================= */
router.get("/stats", protect, adminOnly, getAdminStats);

/* ================= PRODUCT STOCK ================= */
router.put(
  "/products/:id/stock",
  protect,
  adminOnly,
  updateProductStock
);

/* ================= PRODUCTS ================= */

/**
 * CREATE PRODUCT (MULTIPLE IMAGES)
 * Frontend field name: images[]
 */
router.post(
  "/products",
  protect,
  adminOnly,
  upload.array("images", 5), // ✅ Cloudinary
  createProduct
);

router.get("/products", protect, adminOnly, getAllProductsAdmin);

router.put(
  "/products/:id",
  protect,
  adminOnly,
  updateProduct
);

router.patch(
  "/products/:id/toggle",
  protect,
  adminOnly,
  toggleProductStatus
);

router.delete(
  "/products/:id",
  protect,
  adminOnly,
  deleteProduct
);

/**
 * ADD / REPLACE SINGLE PRODUCT IMAGE (EDIT MODE)
 */
router.post(
  "/products/:id/image",
  protect,
  adminOnly,
  upload.single("image"), // ✅ Cloudinary
  uploadProductImage
);

export default router;