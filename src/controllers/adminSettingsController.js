import AdminSettings from "../models/AdminSettings.js";

// ================= GET SETTINGS =================
export const getAdminSettings = async (req, res) => {
  try {
    let settings = await AdminSettings.findOne();

    // Create default settings if not exists
    if (!settings) {
      settings = await AdminSettings.create({
        notificationEmail: "admin@example.com",
        whatsappNumber: "947XXXXXXXX",
        smsNumber: "",
        channels: {
          email: true,
          whatsapp: true,
          sms: false
        }
      });
    }

    res.json({
      success: true,
      settings
    });
  } catch (err) {
    console.error("GET ADMIN SETTINGS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load admin settings"
    });
  }
};

export const updateAdminSettings = async (req, res) => {
  try {
    const { notificationEmail } = req.body;

    let settings = await AdminSettings.findOne();

    if (!settings) {
      settings = await AdminSettings.create({
        notificationEmail: notificationEmail || "admin@example.com",
        whatsappNumber: "94701485736", // fixed reference number
        channels: {
          email: true,
          whatsapp: true
        }
      });
    } else {
      if (notificationEmail !== undefined) {
        settings.notificationEmail = notificationEmail;
      }

      // ❌ Do NOT update whatsapp number
      // ❌ SMS removed completely

      await settings.save();
    }

    res.json({
      success: true,
      settings
    });
  } catch (err) {
    console.error("UPDATE ADMIN SETTINGS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update admin settings"
    });
  }
};