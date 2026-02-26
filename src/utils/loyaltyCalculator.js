// src/utils/loyaltyCalculator.js
import Order from "../models/Order.js";

/**
 * Calculate loyalty tier based on total money spent
 * Rules:
 * - Only delivered orders
 * - Manual mode is respected (no change)
 * - Uses order.total
 */
export async function calculateLoyaltyTier(user) {
  // Safety checks
  if (!user) return null;

  // Respect admin manual override
  if (user.loyaltyMode === "manual") {
    return user.loyaltyTier;
  }

  // Sum total spent from delivered orders
  const orders = await Order.find({
    user: user._id,
    orderStatus: "delivered"
  }).select("total");

  const totalSpent = orders.reduce(
    (sum, o) => sum + (Number(o.total) || 0),
    0
  );

  // Determine tier
  if (totalSpent >= 1_000_000) return "diamond";
  if (totalSpent >= 250_000) return "platinum";
  if (totalSpent >= 100_000) return "gold";
  if (totalSpent >= 50_000) return "silver";

  return "bronze";
}
