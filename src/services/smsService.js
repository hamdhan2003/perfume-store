export async function sendUserSMS(phone, message) {
    if (!phone) {
      console.log("📱 SMS SKIPPED (no phone)");
      return;
    }
  
    console.log("📱 USER SMS:", phone);
    console.log(message);
  }