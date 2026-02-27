// src/utils/sendEmail.js
import nodemailer from "nodemailer";

/**
 * ✅ Create ONE reusable transporter
 * This prevents SMTP timeouts in production
 */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // required for 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
});

/**
 * SEND OTP / VERIFICATION EMAIL
 */
export const sendVerificationEmail = async (to, code) => {
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
};

/**
 * SEND RESET PASSWORD EMAIL
 */
export const sendResetEmail = async (to, link) => {
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
};