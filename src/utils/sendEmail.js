//utils/sendEmail.js
import nodemailer from "nodemailer";

export const sendVerificationEmail = async (to, code) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false, // 🔴 FIX for self-signed cert issue
    },
  });

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



export const sendResetEmail = async (to, link) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // must be true for 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  

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
