import express from "express";
import { updateProfile, getProfile, getBookings } from "./profile.controller";
import { userAuth } from "../../middlewares/index";
import { multerUpload, uploadSingleToS3 } from "../../middlewares/upload";
const router = express.Router();

router.patch("/", userAuth, multerUpload.any(), uploadSingleToS3, updateProfile);
router.get("/bookings", userAuth, getBookings);
router.get("/", userAuth, getProfile);

export default router;
