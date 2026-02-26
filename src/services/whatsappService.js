import fetch from "node-fetch";
import AdminSettings from "../models/AdminSettings.js";

/**
 * Send WhatsApp message to ADMIN
 * Receiver number is read from AdminSettings (DB)
 */
export async function sendAdminWhatsApp(message) {
  try {
    const settings = await AdminSettings.findOne().lean();

    if (!settings || !settings.whatsappNumber) {
      console.log("📱 ADMIN WHATSAPP SKIPPED (no number set)");
      return;
    }

    if (!settings.channels?.whatsapp) {
      console.log("📱 ADMIN WHATSAPP DISABLED BY SETTINGS");
      return;
    }

    const url = `https://graph.facebook.com/v19.0/${process.env.WA_PHONE_ID}/messages`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WA_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: settings.whatsappNumber, // ✅ FROM ADMIN SETTINGS
        type: "text",
        text: {
          body: message.trim()
        }
      })
    });

    const data = await res.json();

    if (data.error) {
      console.error("❌ ADMIN WHATSAPP FAILED:", data.error.message);
    } else {
      console.log("🟢 ADMIN WHATSAPP SENT TO", settings.whatsappNumber);
    }

  } catch (err) {
    console.error("❌ ADMIN WHATSAPP ERROR:", err.message);
  }
}