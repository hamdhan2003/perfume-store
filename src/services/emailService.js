// EMAIL SERVICE – BREVO TRANSACTIONAL API
import fetch from "node-fetch";
// ===============================

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@hirattar.com";

async function sendBrevoEmail(to, subject, html) {
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sender: { name: "Hirah Attar", email: EMAIL_FROM },
        to: [{ email: to }],
        subject,
        htmlContent: html
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("📧 BREVO EMAIL FAILED:", err);
    } else {
      console.log("📧 EMAIL SENT →", to);
    }
  } catch (err) {
    console.error("📧 EMAIL ERROR:", err.message);
  }
}

// ===============================
// ADMIN EMAIL
// ===============================
export async function sendAdminEmail(to, subject, message) {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
      <h2 style="color:#C89B3F;margin-bottom:16px;">${subject}</h2>
      <pre style="white-space:pre-wrap;font-family:inherit;color:#333;">${message}</pre>
      <hr style="margin:24px 0;border:none;border-top:1px solid #eee;">
      <p style="font-size:12px;color:#999;">Hirah Attar — Admin Notification</p>
    </div>
  `;
  await sendBrevoEmail(to, subject, html);
}

// ===============================
// USER ORDER EMAIL (RICH TEMPLATE)
// ===============================
export async function sendUserEmail(user, subject, message) {
  if (!user || !user.email) {
    console.log("📧 USER EMAIL SKIPPED (no email)");
    return;
  }

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#C89B3F;font-size:28px;margin:0;">Hirah Attar</h1>
        <p style="color:#666;margin:4px 0;">Premium Fragrances</p>
      </div>
      <h2 style="color:#333;margin-bottom:16px;">${subject}</h2>
      <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin-bottom:16px;">
        <pre style="white-space:pre-wrap;font-family:inherit;color:#333;margin:0;">${message}</pre>
      </div>
      <hr style="margin:24px 0;border:none;border-top:1px solid #eee;">
      <p style="font-size:12px;color:#999;text-align:center;">
        You're receiving this email because you placed an order with Hirah Attar.<br>
        For support, reply to this email.
      </p>
    </div>
  `;
  await sendBrevoEmail(user.email, subject, html);
}

// ===============================
// USER ORDER EMAIL (WITH ORDER DATA)
// ===============================
export async function sendOrderEmail(to, subject, { orderId, orderShortId, items, total, status, trackingLink }) {
  if (!to) {
    console.log("📧 ORDER EMAIL SKIPPED (no email)");
    return;
  }

  const itemRows = (items || []).map(i =>
    `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee;">${i.name} (${i.size})</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${i.qty}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">LKR ${Number(i.unitPrice || i.price || 0).toFixed(2)}</td>
    </tr>`
  ).join("");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
      <!-- Header -->
      <div style="background:#0A192F;padding:24px;text-align:center;">
        <h1 style="color:#C89B3F;margin:0;font-size:26px;">Hirah Attar</h1>
        <p style="color:#aaa;margin:4px 0;font-size:13px;">Premium Fragrances</p>
      </div>

      <!-- Body -->
      <div style="padding:24px;">
        <h2 style="color:#333;">${subject}</h2>
        <p style="color:#555;">
          Your order <strong style="color:#C89B3F;">${orderShortId}</strong> is now 
          <strong>${status.toUpperCase()}</strong>.
        </p>

        <!-- Items Table -->
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <thead>
            <tr style="background:#f5f1e9;">
              <th style="padding:8px;text-align:left;color:#666;font-size:12px;">PRODUCT</th>
              <th style="padding:8px;text-align:center;color:#666;font-size:12px;">QTY</th>
              <th style="padding:8px;text-align:right;color:#666;font-size:12px;">PRICE</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>

        <!-- Total -->
        <div style="text-align:right;border-top:2px solid #C89B3F;padding-top:12px;margin-top:12px;">
          <strong style="font-size:18px;color:#333;">Total: LKR ${Number(total).toFixed(2)}</strong>
        </div>

        ${trackingLink ? `
        <!-- Tracking Link -->
        <div style="margin-top:24px;text-align:center;">
          <a href="${trackingLink}"
             style="background:#C89B3F;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">
            Track Your Order
          </a>
        </div>
        ` : ""}
      </div>

      <!-- Footer -->
      <div style="background:#f9f6f2;padding:16px;text-align:center;">
        <p style="font-size:12px;color:#999;margin:0;">
          Thank you for shopping with Hirah Attar.<br>
          Order ID: ${orderId}
        </p>
      </div>
    </div>
  `;

  await sendBrevoEmail(to, subject, html);
}