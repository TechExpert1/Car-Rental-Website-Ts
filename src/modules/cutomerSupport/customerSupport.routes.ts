import express from "express";
import { create } from "./customerSupport.controller";

const router = express.Router();

router.post("/", create);

export default router;
