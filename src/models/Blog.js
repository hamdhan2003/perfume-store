import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    slug: {
      type: String,
      required: true,
      unique: true
    },

    content: {
      type: String,
      required: true
    },

    mainImage: {
      type: String,
      default: ""
    },

    tags: [
      {
        type: String,
        trim: true
      }
    ],

    featured: {
      type: Boolean,
      default: false
    },

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft"
    },

    /* ✅ NEW (OPTIONAL, NON-BREAKING) */
    readingTime: {
      type: Number, // minutes
      default: null
    }
  },
  { timestamps: true }
);

export default mongoose.model("Blog", blogSchema);
