import express from "express";
import { createNewDispute, getUserDisputes } from "./dispute.controller";
import { userAuth } from "../../middlewares";

const router = express.Router();

// Create a new dispute
router.post("/", userAuth, createNewDispute);

// Get user's disputes
router.get("/", userAuth, getUserDisputes);

export default router;
