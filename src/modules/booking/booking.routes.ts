import express from "express";
import { updateBooking, getAllBooking } from "./booking.controller";
import { createSession, webhook } from "../../config/stripe";
import { userAuth } from "../../middlewares";

const router = express.Router();
router.post("/", userAuth, createSession);
router.get("/", getAllBooking);
router.patch("/:id", updateBooking);
router.post("/webhook", express.raw({ type: "application/json" }), webhook);
export default router;
