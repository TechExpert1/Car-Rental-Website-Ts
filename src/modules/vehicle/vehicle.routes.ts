import express from "express";
import {
  createVehicle,
  getAllVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  getVehicleReviews,
  deactivateVehicle,
  activateVehicle,
} from "./vehicle.controller";
import { hostAuth } from "../../middlewares";
import { newMulterUpload, uploadMultipleToS3 } from "../../middlewares/upload";
import { optionalAuth } from "../../middlewares/optionalAuth";
const router = express.Router();

router.post("/", hostAuth, newMulterUpload, uploadMultipleToS3, createVehicle);
router.get("/", optionalAuth, getAllVehicles);
router.get("/:id", getVehicleById);
router.get("/:id/reviews", getVehicleReviews);
router.patch("/:id", hostAuth, newMulterUpload, uploadMultipleToS3, updateVehicle);
router.patch("/:id/deactivate", hostAuth, deactivateVehicle);
router.patch("/:id/activate", hostAuth, activateVehicle);
router.delete("/:id", hostAuth, deleteVehicle);


export default router;
