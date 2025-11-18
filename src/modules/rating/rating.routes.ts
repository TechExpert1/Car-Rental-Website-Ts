import express from "express";
import {
  rateGuest,
  rateHost,
  getMyRatings,
  getRatingsForBooking,
} from "./rating.controller";
import { userAuth, hostAuth } from "../../middlewares";

const router = express.Router();

// Rate guest (host only)
router.post("/guest", hostAuth, rateGuest);

// Rate host (any authenticated user/guest)
router.post("/host", userAuth, rateHost);

// Get my ratings
router.get("/my-ratings", userAuth, getMyRatings);

// Get ratings for a specific booking
router.get("/booking/:bookingId", userAuth, getRatingsForBooking);

export default router;
