import express from "express";
import {
  getAdminSettings,
  updateAdminSettings
} from "../controllers/adminSettingsController.js";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";

const router = express.Router();

// 🔐 Admin only
router.get("/", protect, adminOnly, getAdminSettings);
router.put("/", protect, adminOnly, updateAdminSettings);

export default router;