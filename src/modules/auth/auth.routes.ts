import express from "express";
import { login, signup } from "./auth.controller";
import { validateUser } from "./auth.validation";
import { newMulterUpload, uploadMultipleToS3 } from "../../middlewares/upload";
const router = express.Router();

router.post("/sign-up", newMulterUpload, uploadMultipleToS3, validateUser, signup);
router.post("/login", login);

export default router;
