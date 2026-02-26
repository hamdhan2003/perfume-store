import Notification from "../models/Notification.js";

// ================= GET NOTIFICATIONS =================
export const getNotifications = async (req, res) => {
  try {
    let filter = {
      expiresAt: { $gt: new Date() }
    };

    if (req.user.role && req.user.role.startsWith("admin")) {
        filter.recipientType = "admin";
      } else {
        filter.recipientType = "user";
        filter.recipientId = req.user._id;
      }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      notifications
    });
  } catch (err) {
    console.error("GET NOTIFICATIONS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load notifications"
    });
  }
};

export const getUnreadNotificationCount = async (req, res) => {
  try {
    let filter = {
      isRead: false,
      expiresAt: { $gt: new Date() }
    };

    if (req.user.role?.startsWith("admin")) {
      filter.recipientType = "admin";
    } else {
      filter.recipientType = "user";
      filter.recipientId = req.user._id;
    }

    const count = await Notification.countDocuments(filter);

    res.json({ success: true, count });
  } catch (err) {
    console.error("UNREAD COUNT ERROR:", err);
    res.status(500).json({ success: false });
  }
};
// ================= MARK AS READ =================
export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    // Permission check
    if (
      notification.recipientType === "user" &&
      notification.recipientId?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ success: true });
  } catch (err) {
    console.error("MARK READ ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update notification"
    });
  }
};