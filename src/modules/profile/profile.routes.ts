import express from "express";
import { updateProfile, getProfile } from "./profile.controller";
import { userAuth } from "../../middlewares/index";
const router = express.Router();

router.patch("/:id", userAuth, updateProfile);
router.get("/:id", getProfile);

export default router;
