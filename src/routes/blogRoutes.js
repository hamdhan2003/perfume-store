import express from "express";
import multer from "multer";
import {
  createBlog,
  updateBlog,
  deleteBlog,
  getAllBlogsAdmin,
  getPublishedBlogs,
  getBlogBySlug

} from "../controllers/blogController.js";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";
import path from "path"; // ✅ ADD THIS


const router = express.Router();

/* ================= IMAGE UPLOAD ================= */
const storage = multer.diskStorage({
    destination: path.join("src", "uploads", "blogs"),
    filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });
router.get("/published", getPublishedBlogs);
router.get("/slug/:slug", getBlogBySlug);

/* ================= ROUTES ================= */
router.post(
  "/",
  protect,
  adminOnly,
  upload.single("mainImage"),
  createBlog
);

router.patch(
  "/:id",
  protect,
  adminOnly,
  upload.single("mainImage"),
  updateBlog
);

router.delete(
  "/:id",
  protect,
  adminOnly,
  deleteBlog
);

router.get(
    "/admin/all",
    protect,
    adminOnly,
    getAllBlogsAdmin
  );
  

export default router;
