import nodemailer from "nodemailer";

// ===============================
// SMTP CONFIG (GMAIL)
// ===============================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,      // your@gmail.com
    pass: process.env.EMAIL_PASS       // app password
  }
});

// ===============================
// ADMIN EMAIL
// ===============================
export async function sendAdminEmail(to, subject, message) {
  try {
    await transporter.sendMail({
      from: `"Hirah Attar" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text: message
    });

    console.log("📧 ADMIN EMAIL SENT →", to);
  } catch (err) {
    console.error(" ADMIN EMAIL FAILED:", err.message);
  }
}

// ===============================
// USER EMAIL
// ===============================
export async function sendUserEmail(user, subject, message) {
  if (!user || !user.email) {
    console.log("📧 USER EMAIL SKIPPED (no email)");
    return;
  }

  try {
    await transporter.sendMail({
      from: `"Hirah Attar" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject,
      text: message
    });

    console.log("📧 USER EMAIL SENT →", user.email);
  } catch (err) {
    console.error(" USER EMAIL FAILED:", err.message);
  }
}