//userCotroller.js
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Order from "../models/Order.js";
import cloudinary from "../utils/cloudinary.js";
import fs from "fs";
export const deleteMyAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("+password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🔒 Check active orders
    const activeOrders = await Order.findOne({
      user: user._id,
      source: "website",
      orderStatus: { $in: ["pending", "confirmed", "shipped"] }
    });

    if (activeOrders) {
      return res.status(400).json({
        message:
          "You cannot delete your account while you have active orders."
      });
    }

    // 🔑 Password check (local users only)
    if (user.provider === "local") {
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Incorrect password" });
      }
    }

    // 🧹 SOFT DELETE
    user.status = "deleted";
    user.passwordChangedAt = new Date();
    await user.save();

    res.json({ success: true });

  } catch (err) {
    console.error("DELETE ACCOUNT ERROR:", err);
    res.status(500).json({ message: "Failed to delete account" });
  }
};
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    let {
      name,
      phone,
      address,
      status,
      notes,
      role,
      loyaltyTier,
      loyaltyMode
    } = req.body;
    
    const user = await User.findById(id);
    if (user.isVerified === false) {
      return res.status(403).json({
        message: "Pending users cannot be edited"
      });
    }
    
    if (!user) return res.status(404).json({ message: "User not found" });

    // normalize values
    if (role) role = role.toLowerCase();
    if (status) status = status.toLowerCase();

    // ❌ prevent admin downgrade
    if (user.role === "admin" && role && role !== "admin") {
      return res.status(403).json({ message: "Admin role cannot be changed" });
    }

    user.name = name ?? user.name;
    user.phone = phone ?? user.phone;
    user.address = address ?? user.address;
    user.notes = notes ?? user.notes;

// allow only user role (admin locked)
if (role && user.role !== "admin" && role === "user") {
  user.role = "user";
}

    // allow active ↔ banned
    if (status) {
      user.status = status;
    }
// ===============================
// LOYALTY ADMIN OVERRIDE (SAFE)
// ===============================

// Admin can switch loyalty mode
if (loyaltyMode && ["auto", "manual"].includes(loyaltyMode)) {
  user.loyaltyMode = loyaltyMode;
}

// Admin can change tier ONLY in manual mode
if (
  loyaltyTier &&
  ["bronze", "silver", "gold", "platinum", "diamond"].includes(loyaltyTier)
) {
  if (user.loyaltyMode === "manual") {
    user.loyaltyTier = loyaltyTier;
  }
  // else: auto mode → ignore silently (UI will disable later)
}

    await user.save();
    res.json({ success: true, user });

  } catch (err) {
    console.error("UPDATE USER ERROR:", err);
    res.status(500).json({ message: "Failed to update user" });
  }
};



/* DELETE USER (PERMANENT) */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE USER ERROR:", err);
    res.status(500).json({ message: "Failed to delete user" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const {
      name,
      phone,
      address,
      province,
      district,
      city,
      postalCode
    } = req.body;

    /* ===== CORE FIELDS ===== */
    if (typeof name === "string") user.name = name.trim();
    if (typeof phone === "string") user.phone = phone.trim();
    if (typeof address === "string") user.address = address.trim();

    /* ===== USER-ONLY DETAILS ===== */
    if (!user.profileDetails) {
      user.profileDetails = {};
    }

    if (typeof province === "string")
      user.profileDetails.province = province.trim();

    if (typeof district === "string")
      user.profileDetails.district = district.trim();

    if (typeof city === "string")
      user.profileDetails.city = city.trim();

    if (typeof postalCode === "string")
      user.profileDetails.postalCode = postalCode.trim();

    await user.save();

    res.json({
      success: true,
      user: {
        name: user.name,
        phone: user.phone,
        address: user.address,
        profileDetails: user.profileDetails
      }
    });

  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

/* ================= SAVE CHECKOUT DETAILS ================= */
export const saveCheckoutDetails = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      name,
      phone,
      address,
      province,
      district,
      city,
      postalCode
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // save permanently (independent from account name)
    user.savedCheckout = {
      name: name || "",
      phone: phone || "",
      address: address || "",
      province: province || "",
      district: district || "",
      city: city || "",
      postalCode: postalCode || ""
    };

    await user.save();

    res.json({
      success: true,
      savedCheckout: user.savedCheckout
    });

  } catch (err) {
    console.error("SAVE CHECKOUT DETAILS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to save checkout details"
    });
  }
};

/* UPLOAD AVATAR */
export const uploadAvatarController = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // 🔥 USER CAN ONLY UPDATE OWN AVATAR
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "avatars",
    });
    
    user.avatar = result.secure_url;
    
    // delete temp file
    fs.unlinkSync(req.file.path);
        await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        avatar: user.avatar
      }
    });

  } catch (err) {
    console.error("UPLOAD AVATAR ERROR:", err);
    res.status(500).json({ message: "Avatar upload failed" });
  }
};



/* REMOVE AVATAR */
export const removeAvatar = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.avatar = null;
  await user.save();

  res.json({
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      avatar: null,
    },
  });
};
