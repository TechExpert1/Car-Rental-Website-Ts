import express from "express";
import { connectDB } from "./config/index";
import authRoutes from "./modules/auth/auth.routes";
import vehicleRoutes from "./modules/vehicle/vehicle.routes";
import profileRoutes from "./modules/profile/profile.routes";
import bookingRoutes from "./modules/booking/booking.routes";
import reviewRoutes from "./modules/review/review.routes";
import customerSupportRoutes from "./modules/cutomerSupport/customerSupport.routes";
import paymentRoutes from "./modules/payment/payment.routes";
import adminRoutes from "./modules/admin/admin.router";
import disputeRoutes from "./modules/dispute/dispute.routes";
import ratingRoutes from "./modules/rating/rating.routes";
import cors from "cors";
import { webhook } from "./config/stripe";
const app = express();
app.use(cors());

// Webhook routes need raw body for Stripe signature verification
app.post(
  "/bookings/webhook",
  express.raw({ type: "application/json" }),
  webhook
);

app.post(
  "/payment/webhook/connected-account",
  express.raw({ type: "application/json" }),
  async (req, res, next) => {
    const { handleConnectedAccountWebhook } = await import("./modules/payment/payment.controller");
    return handleConnectedAccountWebhook(req, res);
  }
);

app.use(express.json());

connectDB();
app.use("/auth", authRoutes);
app.use("/profile", profileRoutes);
app.use("/bookings", bookingRoutes);
app.use("/vehicles", vehicleRoutes);
app.use("/reviews", reviewRoutes);
app.use("/customer-support", customerSupportRoutes);
app.use("/payment", paymentRoutes);
app.use("/admin", adminRoutes);
app.use("/disputes", disputeRoutes);
app.use("/ratings", ratingRoutes);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
