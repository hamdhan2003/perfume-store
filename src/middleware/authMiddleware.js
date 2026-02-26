import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ message: "Not authorized" });

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
if (!req.user)
  return res.status(401).json({ message: "User not found" });

// 🔥 BLOCK SUSPENDED USERS
if (req.user.status === "suspended") {
  return res.status(403).json({
    success: false,
    reason: "SUSPENDED",
    message: "Your account has been suspended. Please contact support."
  });
}
// 🔐 INVALIDATE OLD TOKENS (LOGOUT ALL DEVICES)
if (
  req.user.passwordChangedAt &&
  decoded.iat * 1000 < req.user.passwordChangedAt.getTime()
) {
  return res.status(401).json({
    message: "Session expired. Please login again."
  });
}

next();

  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

