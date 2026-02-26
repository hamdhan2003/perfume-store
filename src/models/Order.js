import mongoose from "mongoose";

/* ================= ORDER ITEM ================= */
const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    name: { type: String, required: true },
    size: { type: String, required: true }, // 3ml | 6ml | 12ml
    variant: { type: String, default: null },
    qty: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    image: { type: String }
  },
  { _id: false }
);

/* ================= ORDER ================= */
const orderSchema = new mongoose.Schema(
  {
    items: {
      type: [orderItemSchema],
      required: true
    },
    subtotal: { type: Number, required: true },

    deliveryCharge: {
      type: Number,
      required: true,
      default: 0
    },
    
    total: { type: Number, required: true },
    
/* ================= LOYALTY SNAPSHOT ================= */
loyalty: {
  tier: {
    type: String,
    enum: ["bronze", "silver", "gold", "platinum", "diamond"],
    default: "bronze"
  },
  percent: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  }
},


  

    /* ✅ PAYMENT STATUS */
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "paid"
    },

    /* ✅ ORDER STATUS (ADMIN FLOW) */
    orderStatus: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled","returned"],
      default: "pending"
    },
    _soldCountApplied: { type: Boolean, default: false },
/* ================= REVIEW QUEUE ================= */
reviewQueue: [
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    reviewed: {
      type: Boolean,
      default: false
    },
    skipped: {
      type: Boolean,
      default: false
    },
    reviewedAt: {
      type: Date,
      default: null
    }
  }
],



   /* ================= ORDER OWNER ================= */
user: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null          // null = manual / offline order
},

/* ================= ORDER SOURCE ================= */
source: {
  type: String,
  enum: ["website", "admin"],
  default: "website"
},

/* ================= PAYMENT METHOD ================= */
paymentMethod: {
  type: String,
  enum: ["online", "cash", "manual", null],
  default: null
},

/* ================= CUSTOMER SNAPSHOT ================= */
customer: {
  name: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  district: { type: String },      // NEW
  postalCode: { type: String },
  province: {
    type: String,
    default: ""
  },

  city: {
    type: String,
    default: ""
  },
}

  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
