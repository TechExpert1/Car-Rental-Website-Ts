import express from "express";
import {
  createVehicle,
  getAllVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
} from "./vehicle.controller";
import { userAuth } from "../../middlewares";
const router = express.Router();

router.post("/", userAuth, createVehicle);

router.get("/", getAllVehicles);

router.get("/:id", getVehicleById);

router.patch("/:id", userAuth, updateVehicle);

router.delete("/:id", userAuth, deleteVehicle);

export default router;
