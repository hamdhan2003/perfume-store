// src/utils/sendEmail.js
import fetch from "node-fetch";

const MAILERSEND_API = "https://api.mailersend.com/v1/email";

/**
 * SEND OTP / VERIFICATION EMAIL
 */
export const sendVerificationEmail = async (to, code) => {
  try {
    const response = await fetch(MAILERSEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MAILERSEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: {
          email: "mohamed.hamdhan0047@gmail.com", // verified sender
          name: "Hirah Attar",
        },
        to: [
          {
            email: to,
          },
        ],
        subject: "Your Verification Code",
        html: `
          <h2>Verify Your Account</h2>
          <p>Your 4-digit verification code is:</p>
          <h1>${code}</h1>
          <p>This code expires in 10 minutes.</p>
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }
  } catch (err) {
    console.error("❌ OTP EMAIL FAILED:", err);
    throw err;
  }
};

/**
 * SEND RESET PASSWORD EMAIL
 */
export const sendResetEmail = async (to, link) => {
  try {
    const response = await fetch(MAILERSEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MAILERSEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: {
          email: "mohamed.hamdhan0047@gmail.com", // verified sender
          name: "Hirah Attar",
        },
        to: [
          {
            email: to,
          },
        ],
        subject: "Reset Your Password",
        html: `
          <h2>Password Reset</h2>
          <p>Click the link below to reset your password:</p>
          <a href="${link}">${link}</a>
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }
  } catch (err) {
    console.error("❌ RESET EMAIL FAILED:", err);
    throw err;
  }
};