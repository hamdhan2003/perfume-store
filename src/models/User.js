// src/models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },

    // 🔑 Password required ONLY for local users
    password: {
      type: String,
      required: function () {
        return this.provider === "local";
      }
    },

    // 🔑 Allow facebook provider
    provider: {
      type: String,
      enum: ["local", "google", "facebook"],
      default: "local"
    },

    phone: {
      type: String,
      default: ""
    },

    address: {
      type: String,
      default: ""
    },

    notes: {
      type: String,
      default: ""
    },

    name: {
      type: String,
      default: null,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active"
    },
    profileDetails: {
      province: { type: String, default: "" },
      district: { type: String, default: "" },
      city: { type: String, default: "" },
      postalCode: { type: String, default: "" }
    },

// ================= LOYALTY SYSTEM =================

// Loyalty tier of the user
loyaltyTier: {
  type: String,
  enum: ["bronze", "silver", "gold", "platinum", "diamond"],
  default: "bronze"
},

// How loyalty is managed
// auto   → system calculates from total spent
// manual → admin controls tier
loyaltyMode: {
  type: String,
  enum: ["auto", "manual"],
  default: "auto"
},
passwordChangedAt: {
  type: Date,
  default: null
},


    isVerified: {
      type: Boolean,
      default: false,
    },

    resetPasswordToken: {
      type: String,
      default: null,
    },

    resetPasswordExpires: {
      type: Date,
      default: null,
    },

    avatar: {
      type: String,
      default: null,
    },

    verificationCode: {
      type: String,
      default: null,
    },
    // ================= CHECKOUT SAVED DETAILS =================
    // ================= CHECKOUT SAVED DETAILS =================
savedCheckout: {
  name: {
    type: String,
    default: ""
  },
  phone: {
    type: String,
    default: ""
  },
  address: {
    type: String,
    default: ""
  },

  province: {
    type: String,
    default: ""
  },

  district: {
    type: String,
    default: ""
  },

  city: {
    type: String,
    default: ""
  },

  postalCode: {
    type: String,
    default: ""
  }
},

    verificationExpiry: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
