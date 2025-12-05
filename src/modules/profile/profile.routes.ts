import express from "express";
import { updateProfile, getProfile, getBookings } from "./profile.controller";
import { userAuth, upload } from "../../middlewares/index";
const router = express.Router();

router.patch("/", userAuth, upload.single("image"), updateProfile);
router.get("/bookings", userAuth, getBookings);
router.get("/", userAuth, getProfile);

export default router;
