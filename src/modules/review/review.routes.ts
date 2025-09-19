import express from "express";
import {
  createReview,
  updateReview,
  deleteReview,
  getAllReviews,
  getById,
} from "./review.controller";
import { userAuth } from "../../middlewares";

const router = express.Router();

router.post("/", userAuth, createReview);
router.get("/", getAllReviews);
router.get("/:id", userAuth, getById);
router.patch("/:id", userAuth, updateReview);
router.delete("/:id", userAuth, deleteReview);

export default router;
