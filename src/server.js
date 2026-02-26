import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import passport from "passport";

import "./config/passport.js";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import blogRoutes from "./routes/blogRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import adminSettingsRoutes from "./routes/adminSettingsRoutes.js";


dotenv.config();
connectDB();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

app.use("/uploads", express.static(path.join(process.cwd(), "src/uploads")));

app.use("/api/auth", authRoutes);

app.use("/api/admin", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use("/api/admin/settings", adminSettingsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/blogs", blogRoutes);

app.use("/assets", express.static("src/assets"));

app.get("/", (req, res) => {
  res.send("Hirah API Running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
