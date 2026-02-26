import express from "express";
import {
  getNotifications,
  markNotificationRead,
  getUnreadNotificationCount
} from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔔 Get notifications (admin & user)
router.get("/", protect, getNotifications);
router.patch("/:id/read", protect, markNotificationRead);
router.get("/unread-count", protect, getUnreadNotificationCount);
export default router;