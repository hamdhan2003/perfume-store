import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipientType: {
    type: String,
    enum: ["admin", "user"],
    required: true
  },

  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null // null = all admins
  },

  event: {
    type: String,
    required: true
  },

  title: String,
  message: String,

  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order"
  },

  isRead: {
    type: Boolean,
    default: false
  },

  expiresAt: {
    type: Date,
    required: true
  }
}, { timestamps: true });

// Auto delete after 30 days
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Notification", notificationSchema);