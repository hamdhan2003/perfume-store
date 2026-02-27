// ================= adminRoutes.js (FIXED & STABLE) =================
import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";

import {
  getAllUsers,
  getAdminStats,

  createProduct,
  getAllProductsAdmin,
  updateProduct,
  toggleProductStatus,
  deleteProduct,
  uploadProductImage,
  updateProductStock 
} from "../controllers/adminController.js";

import { createUserByAdmin } from "../controllers/adminController.js";
import { uploadAvatarController } from "../controllers/userController.js";

const router = express.Router();

/* ================= MULTER SETUP ================= */
const upload = multer({
  dest: "src/uploads/avatars"   // matches your existing structure
});
const productUpload = multer({
  dest: "src/uploads/products"
});

/* ================= USERS ================= */
router.get("/users", protect, adminOnly, getAllUsers);
router.post("/users", protect, adminOnly, createUserByAdmin);

/* ================= STATS ================= */
router.get("/stats", protect, adminOnly, getAdminStats);





router.put(
  "/products/:id/stock",
  protect,
  adminOnly,
  updateProductStock
);



/* ================= PRODUCTS ================= */
router.post(
  "/products",
  protect,
  adminOnly,
  productUpload.array("images", 5),
  createProduct
);

router.get("/products", protect, adminOnly, getAllProductsAdmin);

router.put("/products/:id", protect, adminOnly, updateProduct);

router.patch(
  "/products/:id/toggle",
  protect,
  adminOnly,
  toggleProductStatus
);

router.delete("/products/:id", protect, adminOnly, deleteProduct);

/* ✅ SINGLE PRODUCT IMAGE UPLOAD (EDIT MODE) */
router.post(
  "/products/:id/image",
  protect,
  adminOnly,
  productUpload.single("image"), // ✅ IMPORTANT
  uploadProductImage
);

export default router;
