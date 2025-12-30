import express from "express";
import {
  updateBooking,
  cancelBooking,
  getAllBooking,
  getUserBookingStats,
  getUserYearlyStats,
  confirmBooking,
  getFinanceAnalytics,
  processImmediatePayout,
} from "./booking.controller";
import { createSession } from "../../config/stripe";
import { userAuth, hostAuth } from "../../middlewares";

const router = express.Router();
router.get("/stats", hostAuth, getUserBookingStats);
router.get("/monthly-stats", hostAuth, getUserYearlyStats);
router.get("/finance-analytics", hostAuth, getFinanceAnalytics); // Comprehensive finance analytics
router.post("/", userAuth, createSession);
router.get("/", userAuth, getAllBooking); // Get user's bookings (authenticated)
router.patch("/:id", userAuth, updateBooking);
router.post("/cancel/:id", userAuth, cancelBooking);
router.post("/confirm", userAuth, confirmBooking); // Confirm booking and schedule payout (authenticated)
router.post("/process-payout", processImmediatePayout); // Immediately process payout for a booking

export default router;
