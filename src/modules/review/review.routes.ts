import express from "express";
import {
  createReview,
  updateReview,
  deleteReview,
  getAllReviews,
  getById,
} from "./review.controller";
import { userAuth } from "../../middlewares";
import { newMulterUpload, uploadMultipleToS3 } from "../../middlewares/upload";

const router = express.Router();

// Accept multipart/form-data with file uploads (field names: media)
router.post("/", userAuth, newMulterUpload, uploadMultipleToS3, createReview);
router.get("/", getAllReviews);
router.get("/:id", userAuth, getById);
router.patch("/:id", userAuth, updateReview);
router.delete("/:id", userAuth, deleteReview);

export default router;
