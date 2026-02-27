///authController.js
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendVerificationEmail,sendResetEmail } from "../utils/sendEmail.js";
import crypto from "crypto";

const ADMIN_EMAIL = "mohamed.hamdhan0047@gmail.com";

/* TOKEN */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};


/* SIGN UP */
export const signup = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "All fields required" });

    let user = await User.findOne({ email });

    // ✅ User exists
    if (user) {
      // If verified → block
      if (user.isVerified) {
        return res.status(400).json({
          message: "User already exists. Please log in."
        });
      }

      // If NOT verified → resend OTP
      const code = Math.floor(1000 + Math.random() * 9000).toString();

      user.verificationCode = code;
      user.verificationExpiry = Date.now() + 10 * 60 * 1000;

      await user.save();
      await sendVerificationEmail(email, code);

      return res.status(200).json({
        message: "Verification code resent",
        requiresOTP: true
      });
    }

    // ✅ New user
    const hashedPassword = await bcrypt.hash(password, 10);
    const role = email === ADMIN_EMAIL ? "admin" : "user";
    const code = Math.floor(1000 + Math.random() * 9000).toString();

    await sendVerificationEmail(email, code);

    await User.create({
      email,
      password: hashedPassword,
      role,
      isVerified: false,
      verificationCode: code,
      verificationExpiry: Date.now() + 10 * 60 * 1000
    });

    return res.status(200).json({
      message: "Verification code sent",
      requiresOTP: true
    });

  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    res.status(500).json({ message: "Signup failed" });
  }
};



/* ================= FORGOT PASSWORD ================= */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    // Always return success message for security
    if (!user) {
      return res.json({
        message: "If that email exists, a reset link has been sent."
      });
    }

    // Block Google users
    if (user.provider !== "local") {
      return res.status(400).json({
        message: "This account uses Google login. Please use Google to sign in."
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes

    await user.save();

    const resetLink =
      `https://perfume-store-production.up.railway.app/reset-password.html?token=${resetToken}`;

    // 🔥 TEMPORARY: console log (later send real email)
    await sendResetEmail(email, resetLink);

    res.json({
      message: "Password reset link sent to your email."
    });

  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};


// ================= SET PASSWORD (GOOGLE / FB USERS) =================
export const setPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const userId = req.user.id;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters"
      });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // ❌ Block if already has password
    if (user.provider === "local") {
      return res.status(400).json({
        message: "Password already set"
      });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    user.password = hashed;
    user.provider = "local"; // 🔥 convert to local user
    await user.save();

    res.json({
      success: true,
      message: "Password set successfully",
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        provider: user.provider
      }
    });

  } catch (err) {
    console.error("SET PASSWORD ERROR:", err);
    res.status(500).json({ message: "Failed to set password" });
  }
};


// ================= CHANGE PASSWORD (LOCAL USERS) =================
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters"
      });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.provider !== "local") {
      return res.status(400).json({
        message: "Password not set for this account"
      });
    }

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(400).json({
        message: "Current password is incorrect"
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({
      success: true,
      message: "Password updated successfully"
    });

  } catch (err) {
    console.error("CHANGE PASSWORD ERROR:", err);
    res.status(500).json({ message: "Failed to change password" });
  }
};

// ================= LOGOUT ALL DEVICES =================
export const logoutAllDevices = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.passwordChangedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: "Logged out from all other devices"
    });
  } catch (err) {
    console.error("LOGOUT ALL DEVICES ERROR:", err);
    res.status(500).json({ message: "Failed to logout sessions" });
  }
};

/* ================= RESET PASSWORD ================= */
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired reset link."
      });
    }

    // Hash new password (same as signup)
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    res.json({ message: "Password updated successfully." });

  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};


export const verifyEmail = async (req, res) => {
  const { email, code } = req.body;

  const user = await User.findOne({ email });

  if (!user)
    return res.status(400).json({ message: "User not found" });

  if (user.isVerified)
    return res.json({ message: "Already verified" });

  if (
    user.verificationCode !== code ||
    user.verificationExpiry < Date.now()
  ) {
    return res.status(400).json({ message: "Invalid or expired code" });
  }

  user.isVerified = true;
  user.verificationCode = null;
  user.verificationExpiry = null;
  await user.save();

  res.json({
    token: generateToken(user),
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
    },
  });
};



export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "All fields required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: "Invalid credentials" });

    if (user.status === "suspended") {
      return res.status(403).json({
        success: false,
        reason: "SUSPENDED",
        message: "Your account has been suspended. Please contact support."
      });
      
    }
    
    
    /**
     * ✅ BLOCK ONLY IF OTP IS ACTUALLY PENDING
     */
    if (
      user.isVerified === false &&
      user.verificationCode &&
      user.verificationExpiry &&
      user.verificationExpiry > Date.now()
    ) {
      return res.status(403).json({
        message: "Please verify your email to continue",
      });
    }

    /**
     * ✅ AUTO-FIX LEGACY USERS
     */
    if (
      user.isVerified === false &&
      !user.verificationCode
    ) {
      user.isVerified = true;
      await user.save();
    }

    res.json({
      token: generateToken(user),
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        avatar: user.avatar
        ? user.avatar.startsWith("http")
          ? user.avatar
          : `${process.env.BACKEND_URL}/${user.avatar}`
        : null,      },
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Login failed" });
  }
};


