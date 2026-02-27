import Product from "../models/Product.js";
import Order from "../models/Order.js";
const resolveImage = (img) => {
  if (!img) return null;

  // Cloudinary or external
  if (img.startsWith("http")) return img;

  // Legacy local uploads
  return `${process.env.BACKEND_URL}/${img}`;
};
/* ================= GET PUBLIC PRODUCTS ================= */
export const getPublicProducts = async (req, res) => {
    try {
      const limit = Number(req.query.limit) || 4;
      const skip = Number(req.query.skip) || 0;
      const quality = req.query.quality; // normal | original
  
      const query = {
        active: true
      };
  
      // ✅ QUALITY FILTER (SAFE)
   // ✅ QUALITY FILTER (CASE-INSENSITIVE FIX)
if (quality && ["normal", "original"].includes(quality)) {
  query.quality = {
    $regex: new RegExp(`^${quality}$`, "i")
  };
}

      const [products, total] = await Promise.all([
        Product.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
  
        Product.countDocuments(query)
      ]);
      const normalizedProducts = products.map(p => ({
        ...p.toObject(),
        images: Array.isArray(p.images)
          ? p.images.map(resolveImage)
          : []
      }));
      
      res.json({
        success: true,
        products: normalizedProducts,
        total
      });
  
    } catch (err) {
      console.error("PUBLIC PRODUCTS ERROR:", err);
      res.status(500).json({ message: "Failed to load products" });
    }
  };

  
  /* ================= GET SINGLE PRODUCT (PUBLIC) ================= */
export const getPublicProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const product = await Product.findOne({
      slug,
      active: true
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    res.json({
      success: true,
      product: {
        ...product.toObject(),
        images: Array.isArray(product.images)
          ? product.images.map(resolveImage)
          : []
      }
    });
  } catch (err) {
    console.error("GET PRODUCT BY SLUG ERROR:", err);
    res.status(500).json({
      message: "Failed to load product"
    });
  }
};

// ==============================
// ADMIN: GET UNIQUE PRIMARY TAGS
// ==============================
export const getPrimaryTags = async (req, res) => {
  try {
    const products = await Product.find(
      { fragranceVariants: { $exists: true, $ne: [] } },
      { fragranceVariants: 1 }
    );

    const tagSet = new Set();

    products.forEach(p => {
      if (p.fragranceVariants && p.fragranceVariants.length > 0) {
        const tag = p.fragranceVariants[0]
          .trim()
          .toLowerCase()
          .replace(/\s+/g, " ");

        if (tag) tagSet.add(tag);
      }
    });

    // Convert to Title Case
    const tags = Array.from(tagSet).map(t =>
      t.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1))
    );

    res.json({ success: true, tags });
  } catch (err) {
    console.error("GET PRIMARY TAGS ERROR:", err);
    res.status(500).json({ message: "Failed to load tags" });
  }
};
export const getPublicPrimaryTags = async (req, res) => {
  try {
    const products = await Product.find(
      { fragranceVariants: { $exists: true, $ne: [] } },
      { fragranceVariants: 1 }
    );

    const set = new Set();

    products.forEach(p => {
      if (p.fragranceVariants?.[0]) {
        set.add(p.fragranceVariants[0]);
      }
    });

    res.json({
      success: true,
      tags: Array.from(set)
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

/* ================= GET SINGLE PRODUCT BY ID (PUBLIC) ================= */
export const getPublicProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findOne({
      _id: id,
      active: true
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    res.json({
      success: true,
      product: {
        ...product.toObject(),
        images: Array.isArray(product.images)
          ? product.images.map(resolveImage)
          : []
      }
    });
  } catch (err) {
    console.error("GET PRODUCT BY ID ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load product"
    });
  }
};
export const submitProductReview = async (req, res) => {
  try {
    const { productId, orderId, rating, comment } = req.body;

    if (!productId || !orderId || !rating) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // 1️⃣ Find order
    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id
    });

    if (!order) {
      return res.status(403).json({
        success: false,
        message: "Order not found or not yours"
      });
    }

    // 2️⃣ Find review queue item
    const queueItem = order.reviewQueue.find(
      q => q.productId.toString() === productId
    );

    if (!queueItem) {
      return res.status(403).json({
        success: false,
        message: "This product is not reviewable in this order"
      });
    }

    if (queueItem.reviewed) {
      return res.status(409).json({
        success: false,
        message: "You already reviewed this product"
      });
    }

    // 3️⃣ Find product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // 4️⃣ Save review into product
    product.reviews.push({
      userId: req.user._id,
      orderId,
      rating,
      comment: comment || "",
      adminReply: null,
      featured: false,
      createdAt: new Date()
    });

    await product.save();

   // 5️⃣ Update order queue state (FINAL FIX)
queueItem.reviewed = true;
queueItem.skipped = false;
queueItem.reviewedAt = new Date();
queueItem.rating = rating;
queueItem.comment = comment || "";

await order.save();


    return res.status(201).json({
      success: true,
      message: "Review saved"
    });

  } catch (err) {
    console.error("SUBMIT REVIEW ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// ==============================
// ADMIN: DELETE REVIEW
// ==============================
export const deleteReview = async (req, res) => {
  try {
    const { productId, reviewId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    const review = product.reviews.id(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found"
      });
    }

    review.deleteOne();   // 🔥 correct way for subdocs in Mongoose

    await product.save();

    res.json({
      success: true,
      message: "Review deleted"
    });

  } catch (err) {
    console.error("DELETE REVIEW ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};




// PUBLIC: get featured reviews for homepage
export const getFeaturedReviews = async (req, res) => {
  try {
    const products = await Product.find({
      "reviews.featured": true
    })
      .populate("reviews.userId", "name avatar location")
      .select("name reviews");

    const featured = [];

    products.forEach(product => {
      product.reviews.forEach(review => {
        if (review.featured) {
          featured.push({
            productName: product.name,
            rating: review.rating,
            comment: review.comment,
            adminReply: review.adminReply || "",
            userName: review.userId?.name || "Customer",
            userAvatar: review.userId?.avatar || "/images/user-placeholder.png",
            userLocation: review.userId?.location || ""
          });
        }
      });
    });

    res.json({ success: true, reviews: featured });

  } catch (err) {
    console.error("FEATURED REVIEWS ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};




export const getProductReviews = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findById(productId)
      .populate("reviews.userId", "name");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    const reviews = product.reviews.map(r => ({
      user: r.userId?.name || "User",
      rating: r.rating,
      comment: r.comment,
      adminReply: r.adminReply,
      featured: r.featured,
      createdAt: r.createdAt
    }));

    return res.json({
      success: true,
      reviews
    });

  } catch (err) {
    console.error("GET REVIEWS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


// ADMIN: reply to a review
export const replyToReview = async (req, res) => {
  try {
    const { productId, reviewId } = req.params;
    const { adminReply, featured } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const review = product.reviews.id(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (adminReply !== undefined) {
      review.adminReply = adminReply;
    }

    if (featured !== undefined) {
      review.featured = !!featured;
    }

    await product.save();

    res.json({
      success: true,
      message: "Review updated",
      review
    });
  } catch (err) {
    console.error("ADMIN REPLY ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// ==============================
// ADMIN: GET ALL REVIEWS
// ==============================
export const getAllReviewsForAdmin = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("reviews.userId", "name avatar location")
      .select("name reviews");

    const results = [];

    products.forEach(product => {
      product.reviews.forEach(review => {
        results.push({
          product: {
            _id: product._id,
            name: product.name
          },
          review: {
            _id: review._id,
            rating: review.rating,
            comment: review.comment,
            adminReply: review.adminReply || "",
            featured: review.featured || false,
            createdAt: review.createdAt
          },
          userName: review.userId?.name || "Customer",
          userAvatar: review.userId?.avatar || "/images/user-placeholder.png",
          userLocation: review.userId?.location || ""
        });
      });
    });

    res.json({ success: true, reviews: results });

  } catch (err) {
    console.error("ADMIN REVIEWS ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};







export const getTopSoldProduct = async (req, res) => {
  try {
    const quality = req.query.quality;

    const query = { 
      active: true,
      soldCount: { $gt: 0 }   // 🔒 BLOCK UNSOLD PRODUCTS
    };
        if (quality && ["normal", "original"].includes(quality)) {
      query.quality = quality;
    }

    const product = await Product.findOne(query)
      .sort({ soldCount: -1, updatedAt: -1 })
      .lean();

    res.json({
      success: true,
      product: product || null
    });

  } catch (err) {
    console.error("TOP SOLD ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load top sold product"
    });
  }
};
