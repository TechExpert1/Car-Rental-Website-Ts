import express from "express";
import { connectDB } from "./config/index";
import authRoutes from "./modules/auth/auth.routes";
import vehicleRoutes from "./modules/vehicle/vehicle.routes";
import profileRoutes from "./modules/profile/profile.routes";
import bookingRoutes from "./modules/booking/booking.routes";
import cors from "cors";
import { webhook } from "./config/stripe";
const app = express();
app.use(cors());
app.post(
  "/bookings/webhook",
  express.raw({ type: "application/json" }),
  webhook
);
app.use(express.json());

connectDB();
app.use("/auth", authRoutes);
app.use("/profile", profileRoutes);
app.use("/bookings", bookingRoutes);
app.use("/vehicles", vehicleRoutes);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
