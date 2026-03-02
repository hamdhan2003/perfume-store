import SibApiV3Sdk from "sib-api-v3-sdk";

/* ================= BREVO CLIENT SETUP ================= */
const client = SibApiV3Sdk.ApiClient.instance;

// 🔐 API KEY (Railway ENV)
client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

// 📧 Sender (must be verified in Brevo)
const SENDER = {
  email: process.env.EMAIL_FROM,
  name: "Hirah Attar"
};

/* ================= SEND OTP EMAIL ================= */
export const sendVerificationEmail = async (to, code) => {
  try {
    await emailApi.sendTransacEmail({
      sender: SENDER,
      to: [{ email: to }],
      subject: "Your Verification Code",
      htmlContent: `
        <h2>Verify Your Account</h2>
        <p>Your 4-digit verification code is:</p>
        <h1 style="letter-spacing:4px">${code}</h1>
        <p>This code expires in 10 minutes.</p>
      `
    });

    console.log("📧 OTP EMAIL SENT →", to);
  } catch (err) {
    console.error(
      "❌ OTP EMAIL FAILED:",
      err.response?.text || err.message
    );
  }
};

/* ================= SEND RESET PASSWORD EMAIL ================= */
export const sendResetEmail = async (to, resetLink) => {
  try {
    await emailApi.sendTransacEmail({
      sender: SENDER,
      to: [{ email: to }],
      subject: "Reset Your Password",
      htmlContent: `
        <h2>Password Reset Request</h2>
        <p>Click the button below to reset your password:</p>
        <p>
          <a href="${resetLink}"
             style="
               display:inline-block;
               padding:12px 20px;
               background:#000;
               color:#fff;
               text-decoration:none;
               border-radius:6px;
             ">
            Reset Password
          </a>
        </p>
        <p>If you didn’t request this, you can safely ignore this email.</p>
      `
    });

    console.log("📧 RESET EMAIL SENT →", to);
  } catch (err) {
    console.error(
      "❌ RESET EMAIL FAILED:",
      err.response?.text || err.message
    );
  }
};