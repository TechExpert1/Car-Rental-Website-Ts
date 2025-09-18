import express from "express";
import { updateBooking, getAllBooking } from "./booking.controller";
import { createSession } from "../../config/stripe";
import { userAuth } from "../../middlewares";

const router = express.Router();
router.post("/", userAuth, createSession);
router.get("/", getAllBooking);
router.patch("/:id", updateBooking);

export default router;
