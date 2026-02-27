//userRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import cloudinary from "../config/cloudinary.js";
import { protect } from "../middleware/authMiddleware.js";
import {
  updateProfile,
  uploadAvatarController,
  removeAvatar,
  updateUser,
  deleteUser,
  saveCheckoutDetails,
  deleteMyAccount 
} from "../controllers/userController.js";

const router = express.Router();

/* ===== SINGLE MULTER CONFIG ===== */
const storage = multer.diskStorage({
  destination: "src/uploads/avatars",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only images allowed"), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 800 * 1024 },
});
// ✅ GET CURRENT LOGGED-IN USER
router.get("/me", protect, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});
router.put(
  "/checkout-details",
  protect,
  saveCheckoutDetails
);

router.post("/delete-account", protect, deleteMyAccount);
router.put("/profile", protect, updateProfile);
router.put("/avatar", protect,   upload.single("avatar"),   
 uploadAvatarController);
router.delete("/avatar", protect, removeAvatar);
router.put("/:id", protect, updateUser);
router.delete("/:id", protect, deleteUser);

export default router;
