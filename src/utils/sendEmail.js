// src/utils/sendEmail.js
import nodemailer from "nodemailer";

/**
 * ✅ SINGLE REUSABLE TRANSPORTER (VERY IMPORTANT)
 */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
});

/**
 * ✅ VERIFY TRANSPORTER ON BOOT
 * Prevents silent failures in production
 */
transporter.verify((err, success) => {
  if (err) {
    console.error("❌ EMAIL TRANSPORTER ERROR:", err);
  } else {
    console.log("✅ EMAIL TRANSPORTER READY");
  }
});

/**
 * =============================
 * SEND OTP / VERIFICATION EMAIL
 * =============================
 */
export const sendVerificationEmail = async (to, code) => {
  try {
    await transporter.sendMail({
      from: `"Hirah Attar" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Your Verification Code",
      html: `
        <h2>Verify Your Account</h2>
        <p>Your 4-digit verification code is:</p>
        <h1 style="letter-spacing:4px">${code}</h1>
        <p>This code expires in 10 minutes.</p>
      `,
    });
  } catch (err) {
    console.error("❌ OTP EMAIL FAILED:", err);
    throw new Error("OTP_EMAIL_FAILED");
  }
};

/**
 * =============================
 * SEND RESET PASSWORD EMAIL
 * =============================
 */
export const sendResetEmail = async (to, link) => {
  try {
    await transporter.sendMail({
      from: `"Hirah Attar" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Reset Your Password",
      html: `
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${link}" target="_blank">${link}</a>
        <p>This link expires in 15 minutes.</p>
      `,
    });
  } catch (err) {
    console.error("❌ RESET EMAIL FAILED:", err);
    throw new Error("RESET_EMAIL_FAILED");
  }
};