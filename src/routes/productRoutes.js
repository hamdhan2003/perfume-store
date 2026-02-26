import express from "express";
import { getPublicProducts,replyToReview,getFeaturedReviews,getPrimaryTags,getPublicPrimaryTags,
    getPublicProductBySlug, getAllReviewsForAdmin, getPublicProductById, getTopSoldProduct,submitProductReview,getProductReviews,deleteReview,
} from "../controllers/productController.js";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";


const router = express.Router();

/* PUBLIC */
router.get("/", getPublicProducts);
/* PUBLIC */
router.get(
  "/admin/primary-tags",
  protect,
  adminOnly,
  getPrimaryTags
);
router.get("/primary-tags", getPublicPrimaryTags);

router.get("/top-sold", getTopSoldProduct);
router.get("/slug/:slug", getPublicProductBySlug);
router.get("/:id", getPublicProductById);
router.post("/reviews", protect, submitProductReview);
router.patch(
    "/:productId/reviews/:reviewId/reply",
    protect,
    adminOnly,
    replyToReview
  );
  
  router.get(
    "/admin/reviews",
    protect,
    adminOnly,
    getAllReviewsForAdmin
  );

  
  router.get("/reviews/featured", getFeaturedReviews);

  router.get("/:id/reviews", getProductReviews);
  router.delete(
    "/:productId/reviews/:reviewId",
    protect,
    adminOnly,
    deleteReview
  );
  
export default router;
