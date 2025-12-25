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
// Get reviews with optional filters (vehicle, pagination)
router.get("/", getAllReviews);
// Get reviews created by the authenticated user or for host's vehicles
router.get("/mine", userAuth, getAllReviews);
router.get("/:id", userAuth, getById);
router.patch("/:id", userAuth, updateReview);
router.delete("/:id", userAuth, deleteReview);

export default router;
