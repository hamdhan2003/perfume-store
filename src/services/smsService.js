// SMS SERVICE – BREVO SMS API
import fetch from "node-fetch";
// ===============================

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER = process.env.BREVO_SENDER || "HirahAttar";

export async function sendUserSMS(phone, message) {
  // 🔇 SMS DISABLED — only email notifications are active
  console.log("📱 SMS DISABLED — skipping");
  return;

  if (!phone) {
    console.log("📱 SMS SKIPPED (no phone)");
    return;
  }

  // Normalize phone: Brevo requires international format without +
  // Sri Lanka: 07XXXXXXXX → 947XXXXXXXX
  let normalized = String(phone).replace(/\s+/g, "").replace(/^\+/, "");

  // Auto-prefix Sri Lanka numbers (07X → 947X)
  if (normalized.startsWith("0") && normalized.length === 10) {
    normalized = "94" + normalized.slice(1);
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sender: BREVO_SENDER,
        recipient: normalized,
        content: message,
        type: "transactional"
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("📱 SMS FAILED:", err);
    } else {
      console.log("📱 SMS SENT →", normalized);
    }
  } catch (err) {
    console.error("📱 SMS ERROR:", err.message);
  }
}