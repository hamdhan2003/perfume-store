//userRoutes.js
import express from "express";
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
import upload from "../middleware/upload.js";
const router = express.Router();




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
router.put("/avatar", protect, upload.single("avatar"), uploadAvatarController);
router.delete("/avatar", protect, removeAvatar);
router.put("/:id", protect, updateUser);
router.delete("/:id", protect, deleteUser);

export default router;
