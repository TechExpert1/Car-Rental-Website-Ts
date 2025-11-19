import express from "express";
import {
  updateBooking,
  cancelBooking,
  getAllBooking,
  getUserBookingStats,
  getUserYearlyStats,
  confirmBooking,
} from "./booking.controller";
import { createSession } from "../../config/stripe";
import { userAuth, hostAuth } from "../../middlewares";

const router = express.Router();
router.get("/stats", hostAuth, getUserBookingStats);
router.get("/monthly-stats", hostAuth, getUserYearlyStats);
router.post("/", userAuth, createSession);
router.get("/", getAllBooking);
router.patch("/:id", updateBooking);
router.post("/cancel/:id", userAuth, cancelBooking);
router.post("/confirm", confirmBooking); // Confirm booking and schedule payout

export default router;
