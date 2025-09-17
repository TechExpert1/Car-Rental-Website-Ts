import express from "express";
import { updateBooking, getAllBooking } from "./booking.controller";

const router = express.Router();

router.get("/", getAllBooking);
router.patch("/:id", updateBooking);

export default router;
