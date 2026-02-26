import express from "express";
import {
  signup,
  login,
  verifyEmail,forgotPassword, resetPassword,setPassword, changePassword,logoutAllDevices 
} from "../controllers/authController.js";
import passport from "passport";
import jwt from "jsonwebtoken";
import { protect } from "../middleware/authMiddleware.js";


const router = express.Router();
// ================= GOOGLE LOGIN =================

// 1️⃣ Redirect user to Google
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"]
  })
);

router.post("/set-password", protect, setPassword);
router.post("/change-password", protect, changePassword);
router.post("/logout-all", protect, logoutAllDevices);

// 2️⃣ Google callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "http://127.0.0.1:5500/index.html?error=google_failed"
  }),
  (req, res) => {
    // 🔥 Issue YOUR JWT (same as normal login)
    const token = jwt.sign(
      { id: req.user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 🔁 Redirect back to frontend with token
    res.redirect(
      `http://127.0.0.1:5500/index.html?token=${token}`
    );
  }
);

// ================= FACEBOOK LOGIN =================

// 1️⃣ Redirect to Facebook
router.get(
  "/facebook",
  passport.authenticate("facebook")

);

// 2️⃣ Facebook callback
router.get(
  "/facebook/callback",
  passport.authenticate("facebook", {
    session: false,
    failureRedirect: "http://127.0.0.1:5500/index.html?error=facebook_failed"
  }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.redirect(
      `http://127.0.0.1:5500/index.html?token=${token}`
    );
  }
);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.post("/signup", signup);
router.post("/verify", verifyEmail);
router.post("/login", login);

export default router;
