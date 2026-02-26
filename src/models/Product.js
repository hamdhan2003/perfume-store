//Product.jsfrom models
import mongoose from "mongoose";

/* ================= PRICE SCHEMA ================= */
const priceSchema = new mongoose.Schema(
 // ================= PRICE STRUCTURE =================
 {
  base6ml: {
    type: Number,
    required: true
  },

  // % difference from base 6ml
  sizePercentages: {
    size3: { type: Number, default: -30 },   // -30%
    size12: { type: Number, default: 35 }    // +35%
  },

  // Discount % per size (optional)
  discountPercentages: {
    base: { type: Number, default: null },   // 6ml discount %
    size3: { type: Number, default: null },  // 3ml discount %
    size12: { type: Number, default: null }  // 12ml discount %
  }
},

  { _id: false }
);

/* ================= PRODUCT SCHEMA ================= */
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: {
      type: String,
      unique: true,
      index: true
    },
    
    quality: {
      type: String,
      enum: ["normal", "original"],
      required: true
    },
    soldCount: {
      type: Number,
      default: 0
    },
    
    description: { type: String, default: "" },
/* ================= FRAGRANCE VARIANTS ================= */
fragranceVariants: {
  type: [String],
  default: []   // e.g. ["Oud", "Musk"]
},

/* ================= FRAGRANCE NOTES ================= */
notes: {
  top: {
    type: [String],
    default: []
  },
  heart: {
    type: [String],
    default: []
  },
  base: {
    type: [String],
    default: []
  }
},

/* ================= PRODUCT ATTRIBUTES ================= */
attributes: {
  longLasting: { type: Boolean, default: false }, // 12+ Hours
  alcoholFree: { type: Boolean, default: false },
  pureAttar: { type: Boolean, default: false }
},

    prices: {
      type: priceSchema,
      required: true
    },

    inventoryQty: { type: Number, required: true },

    images: [{ type: String }],

    bottleSizes: [
      {
        sizeMl: {
          type: Number,
          enum: [3, 6, 12],
          required: true
        },
        stock: {
          type: Number,
          default: 0
        },
        enabled: {
          type: Boolean,
          default: true
        }
      }
    ],
    reviews: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        },
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Order",
          required: true
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5
        },
        comment: {
          type: String,
          default: ""
        },
        adminReply: {
          type: String,
          default: null
        },
        featured: {
          type: Boolean,
          default: false
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    
    
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);
// ================= SLUG GENERATION =================
productSchema.pre("save", function (next) {
  if (this.isModified("name") || this.isNew) {
    const baseSlug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    // use last 6 chars of MongoDB _id (always unique)
    const shortId = this._id.toString().slice(-6);

    this.slug = `${baseSlug}-${shortId}`;
  }
  next();
});


export default mongoose.model("Product", productSchema);
