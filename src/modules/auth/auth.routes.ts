import express from "express";
import { login, signup } from "./auth.controller";
import { validateUser } from "./auth.validation";
const router = express.Router();

router.post("/sign-up", validateUser, signup);
router.post("/login", login);

export default router;
