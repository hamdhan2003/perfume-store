// src/utils/sendEmail.js
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * SEND OTP / VERIFICATION CODE
 */
export const sendVerificationEmail = async (to, code) => {
  try {
    await resend.emails.send({
      from: "Hirah Attar <onboarding@resend.dev>",
      to,
      subject: "Your Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Verify Your Account</h2>
          <p>Your 4-digit verification code is:</p>
          <h1 style="letter-spacing:4px">${code}</h1>
          <p>This code expires in 10 minutes.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("RESEND OTP EMAIL ERROR:", error);
    throw new Error("Failed to send verification email");
  }
};

/**
 * SEND RESET PASSWORD EMAIL
 */
export const sendResetEmail = async (to, link) => {
  try {
    await resend.emails.send({
      from: "Hirah Attar <onboarding@resend.dev>",
      to,
      subject: "Reset Your Password",
      html: `
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${link}" target="_blank">${link}</a>
        <p>This link expires in 15 minutes.</p>
      `,
    });
  } catch (error) {
    console.error("RESEND RESET EMAIL ERROR:", error);
    throw new Error("Failed to send reset email");
  }
};