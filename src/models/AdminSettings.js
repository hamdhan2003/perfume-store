import mongoose from "mongoose";

const adminSettingsSchema = new mongoose.Schema(
  {
    notificationEmail: {
      type: String,
      required: true
    },

    // 🔒 WhatsApp number is fixed (Meta controlled)
    whatsappNumber: {
      type: String,
      required: true
    },

    channels: {
      email: {
        type: Boolean,
        default: true
      },
      whatsapp: {
        type: Boolean,
        default: true
      }
    }
  },
  { timestamps: true }
);

export default mongoose.model("AdminSettings", adminSettingsSchema);