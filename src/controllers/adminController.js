import User from "../models/User.js";
import bcrypt from "bcryptjs";
import Product from "../models/Product.js";
import { calculatePrices } from "../utils/priceCalculator.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";

// ADD BELOW IMPORTS (top)
const resolveImage = (img) => {
  if (!img) return null;
  if (img.startsWith("http")) return img;
  return `${process.env.BACKEND_URL}/${img}`;
};
/* ================= GET ALL USERS ================= */
export const getAllUsers = async (req, res) => {
  try {
    // ⚠️ Important: do NOT exclude profileDetails
    const users = await User.find().select(
      "-password -resetPasswordToken -resetPasswordExpires"
    );
    

    const formattedUsers = users.map(user => {
      const u = user.toObject();
    
      let computedStatus = "active";
      if (u.status === "suspended") computedStatus = "suspended";
      else if (u.isVerified === false) computedStatus = "pending";
    
      return {
        ...u,
    
        // 🔑 normalize profile details for admin
        profileDetails: {
          province: u.profileDetails?.province || "",
          district: u.profileDetails?.district || "",
          city: u.profileDetails?.city || "",
          postalCode: u.profileDetails?.postalCode || ""
        },
    
        computedStatus
      };
    });
    

    res.json({
      success: true,
      users: formattedUsers
    });

  } catch (err) {
    console.error("GET ALL USERS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};





export const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();

    const activeUsers = await User.countDocuments({
      isVerified: true,
      status: "active"
    });

    const suspendedUsers = await User.countDocuments({
      status: "suspended"
    });

    const pendingUsers = await User.countDocuments({
      isVerified: false
    });

    res.json({
      success: true,
      totalUsers,
      activeUsers,
      suspendedUsers,
      pendingUsers
    });

  } catch (err) {
    res.status(500).json({ message: "Failed to load stats" });
  }
};






/* ================= ADD PRODUCT ================= */
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      quality,
      description,
      prices,
      inventoryQty,
      fragranceVariants,
      notes,
      attributes
    } = req.body;

    /* ================= VALIDATION ================= */
    if (!name || !quality || !description || !prices || !inventoryQty) {
      return res.status(400).json({
        message: "All product fields are required"
      });
    }

/* ================= IMAGES ================= */
let images = [];

if (req.files && req.files.length > 0) {
  for (const file of req.files) {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: "products",
    });

    images.push(result.secure_url);

    // delete temp file
    fs.unlinkSync(file.path);
  }
}

if (!images.length) {
  return res.status(400).json({
    message: "Product image is required"
  });
}

    if (!images.length) {
      return res.status(400).json({
        message: "Product image is required"
      });
    }

    /* ================= PARSE & VALIDATE PRICES ================= */
    const parsedPrices =
      typeof prices === "string" ? JSON.parse(prices) : prices;

    if (
      !parsedPrices ||
      typeof parsedPrices.base6ml !== "number" ||
      parsedPrices.base6ml <= 0
    ) {
      return res.status(400).json({
        message: "Base 6ml price is required"
      });
    }

    /* ================= STOCK ================= */
    const initialStock = Number(inventoryQty);
    if (initialStock < 0) {
      return res.status(400).json({
        message: "Invalid stock quantity"
      });
    }
    let parsedVariantsRaw;

    try {
      parsedVariantsRaw =
        typeof fragranceVariants === "string"
          ? JSON.parse(fragranceVariants)
          : fragranceVariants;
    } catch {
      parsedVariantsRaw = [];
    }
    
    const parsedVariants = Array.isArray(parsedVariantsRaw)
      ? parsedVariantsRaw
          .filter(v => typeof v === "string")
          .map((v, i) => {
            let cleaned = v.trim().replace(/\s+/g, " ");
            if (i === 0) {
              cleaned = cleaned
                .toLowerCase()
                .replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1));
            }
            return cleaned;
          })
                    .filter(Boolean)
          .slice(0, 5) // ✅ MAX 5
      : [];
    
  const parsedNotes =
    typeof notes === "string"
      ? JSON.parse(notes)
      : notes ?? { top: [], heart: [], base: [] };
  
  const parsedAttributes =
    typeof attributes === "string"
      ? JSON.parse(attributes)
      : attributes ?? {
          longLasting: false,
          alcoholFree: false,
          pureAttar: false
        };
  
    /* ================= CREATE PRODUCT ================= */
    const product = await Product.create({
      name,
      quality,                 // normal | original
      description,

      /* ✅ PRICE STRUCTURE (SINGLE SOURCE OF TRUTH) */
      prices: {
        base6ml: Number(parsedPrices.base6ml),

        sizePercentages: parsedPrices.sizePercentages ?? {
          size3: -30,
          size12: 35
        },

        discountPercentages: parsedPrices.discountPercentages ?? {
          base: null,
          size3: null,
          size12: null
        }
      },
      fragranceVariants: parsedVariants,

      notes: {
        top: parsedNotes.top ?? [],
        heart: parsedNotes.heart ?? [],
        base: parsedNotes.base ?? []
      },
      
      attributes: {
        longLasting: !!parsedAttributes.longLasting,
        alcoholFree: !!parsedAttributes.alcoholFree,
        pureAttar: !!parsedAttributes.pureAttar
      },
      
      inventoryQty: initialStock,

      /* ✅ INITIAL STOCK PER SIZE (SYNCED) */
      bottleSizes: [
        { sizeMl: 3, stock: initialStock, enabled: true },
        { sizeMl: 6, stock: initialStock, enabled: true },
        { sizeMl: 12, stock: initialStock, enabled: true }
      ],

      images,
      active: true
    });

    res.json({
      success: true,
      product
    });

  } catch (err) {
    console.error("CREATE PRODUCT ERROR:", err);
    res.status(500).json({
      message: "Failed to create product"
    });
  }
};



export const updateProduct = async (req, res) => {
  try {
    const updatePayload = {};

    if (req.body.name !== undefined)
      updatePayload.name = req.body.name;

    if (req.body.quality !== undefined)
      updatePayload.quality = req.body.quality;

    if (req.body.description !== undefined)
      updatePayload.description = req.body.description;
    
    
    if (req.body.fragranceVariants !== undefined) {
      let raw;
    
      try {
        raw =
          typeof req.body.fragranceVariants === "string"
            ? JSON.parse(req.body.fragranceVariants)
            : req.body.fragranceVariants;
      } catch {
        raw = [];
      }
    
      updatePayload.fragranceVariants = Array.isArray(raw)
        ? raw
            .filter(v => typeof v === "string")
            .map(v => v.trim())
            .filter(Boolean)
            .slice(0, 5) // ✅ MAX 5
        : [];
    }
    
    
    if (req.body.notes !== undefined) {
      const parsedNotes =
        typeof req.body.notes === "string"
          ? JSON.parse(req.body.notes)
          : req.body.notes;
    
      updatePayload.notes = {
        top: parsedNotes.top ?? [],
        heart: parsedNotes.heart ?? [],
        base: parsedNotes.base ?? []
      };
    }
    
    if (req.body.attributes !== undefined) {
      const parsedAttributes =
        typeof req.body.attributes === "string"
          ? JSON.parse(req.body.attributes)
          : req.body.attributes;
    
      updatePayload.attributes = {
        longLasting: !!parsedAttributes.longLasting,
        alcoholFree: !!parsedAttributes.alcoholFree,
        pureAttar: !!parsedAttributes.pureAttar
      };
    }
    
    if (req.body.inventoryQty !== undefined)
      updatePayload.inventoryQty = Number(req.body.inventoryQty);

   // IMPORTANT: prices must be fully replaced if sent
if (req.body.prices !== undefined) {
  updatePayload.prices = {
    base6ml: Number(req.body.prices.base6ml),
    sizePercentages: {
      size3: Number(req.body.prices.sizePercentages?.size3 ?? -30),
      size12: Number(req.body.prices.sizePercentages?.size12 ?? 35)
    },
    discountPercentages: {
      base: req.body.prices.discountPercentages?.base ?? null,
      size3: req.body.prices.discountPercentages?.size3 ?? null,
      size12: req.body.prices.discountPercentages?.size12 ?? null
    }
  };
}

    
    

    if (req.body.active !== undefined)
      updatePayload.active = req.body.active;

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({
        message: "No fields provided to update"
      });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ success: true, product });
  } catch (err) {
    console.error("UPDATE PRODUCT ERROR:", err);
    res.status(500).json({ message: "Failed to update product" });
  }
};


/* ================= UPDATE PRODUCT STOCK ================= */
export const updateProductStock = async (req, res) => {
  try {
    const { bottleSizes } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.bottleSizes = product.bottleSizes.map(bs => {
      const incoming = bottleSizes.find(
        s => Number(s.sizeMl) === Number(bs.sizeMl)
      );

      if (!incoming) return bs;

      const newStock = Number(incoming.stock) || 0;
      let newEnabled = bs.enabled;

      // 🔁 AUTO RULES
      if (newStock === 0) {
        newEnabled = false;                     // force disable
      }

      if (bs.stock === 0 && newStock > 0) {
        newEnabled = true;                      // auto-enable when stock added
      }

      // 🧠 MANUAL TOGGLE RULES (only when stock > 0)
      if (newStock > 0 && incoming.enabled !== undefined) {
        newEnabled = Boolean(incoming.enabled); // allow manual on/off
      }

      // ❌ BLOCK MANUAL ON WHEN STOCK = 0
      if (newStock === 0) {
        newEnabled = false;
      }

      return {
        ...bs.toObject(),
        stock: newStock,
        enabled: newEnabled
      };
    });

    await product.save();

    res.json({
      success: true,
      bottleSizes: product.bottleSizes
    });
  } catch (err) {
    console.error("STOCK UPDATE ERROR:", err);
    res.status(500).json({ message: "Stock update failed" });
  }
};




export const uploadProductImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "products"
    });
    fs.unlinkSync(req.file.path);

    // you decided: single image only
    product.images = [imagePath];
    await product.save();

    res.json({
      success: true,
      images: product.images
    });
  } catch (err) {
    console.error("UPLOAD PRODUCT IMAGE ERROR:", err);
    res.status(500).json({ message: "Image upload failed" });
  }
};


/* ================= GET ALL PRODUCTS (ADMIN) ================= */
export const getAllProductsAdmin = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });

    const mapped = products.map(p => {
      const obj = p.toObject();
    
      return {
        ...obj,
        images: Array.isArray(obj.images)
          ? obj.images.map(resolveImage)
          : [],
        calculatedPrices: calculatePrices(obj.prices)
      };
    });

    res.json({
      success: true,
      products: mapped
    });

  } catch (err) {
    console.error("FETCH PRODUCTS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
};










/* ================= TOGGLE PRODUCT STATUS ================= */
export const toggleProductStatus = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  product.active = !product.active;
  await product.save();

  res.json({ success: true, active: product.active });
};

export const deleteProduct = async (req, res) => {
  try {
    console.log("DELETE REQUEST RECEIVED:", req.params.id);

    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    console.log("PRODUCT DELETED:", product._id);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ message: "Failed to delete product" });
  }
};



  
  
  export const createUserByAdmin = async (req, res) => {
    try {
      const { name, email, phone, password, role, status, address, notes } = req.body;
  
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }
  
      const exists = await User.findOne({ email });
      if (exists) {
        return res.status(400).json({ message: "User already exists" });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const user = await User.create({
        name,
        email,
        phone,
        address,
        notes,
        password: hashedPassword,
        role: role ? role.toLowerCase() : "user",
        status: status ? status.toLowerCase() : "active",
        isVerified: true,              // ✅ FIX
        verifiedAt: new Date()         // ✅ optional but recommended
      });
  
      res.json({ success: true, user });
  
    } catch (err) {
      console.error("ADMIN CREATE USER ERROR:", err);
      res.status(500).json({ message: "Failed to create user" });
    }
  };
  