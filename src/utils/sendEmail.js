import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const FROM = `"Hirah Attar" <${process.env.EMAIL_FROM}>`;

export const sendVerificationEmail = async (to, code) => {
  try {
    await transporter.sendMail({
      from: FROM,
      to,
      subject: "Your Verification Code",
      html: `
        <h2>Verify Your Account</h2>
        <p>Your 4-digit verification code is:</p>
        <h1>${code}</h1>
        <p>This code expires in 10 minutes.</p>
      `
    });
    console.log("📧 OTP EMAIL SENT →", to);
  } catch (err) {
    console.error("❌ OTP EMAIL FAILED:", err.message);
  }
};

export const sendResetEmail = async (to, link) => {
  try {
    await transporter.sendMail({
      from: FROM,
      to,
      subject: "Reset Your Password",
      html: `<a href="${link}">${link}</a>`
    });
    console.log("📧 RESET EMAIL SENT →", to);
  } catch (err) {
    console.error("❌ RESET EMAIL FAILED:", err.message);
  }
};