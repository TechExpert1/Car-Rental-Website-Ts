import express from "express";
import {
  createVehicle,
  getAllVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  getVehicleReviews,
} from "./vehicle.controller";
import { hostAuth } from "../../middlewares";
const router = express.Router();

router.post("/", hostAuth, createVehicle);
router.get("/", getAllVehicles);
router.get("/:id", getVehicleById);
router.get("/:id/reviews", getVehicleReviews);
router.patch("/:id", hostAuth, updateVehicle);
router.delete("/:id", hostAuth, deleteVehicle);


export default router;
