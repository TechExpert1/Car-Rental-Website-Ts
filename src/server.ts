import express from "express";
import { connectDB } from "./config/index";
import authRoutes from "./modules/auth/auth.routes";
import vehicleRoutes from "./modules/vehicle/vehicle.routes";
import profileRoutes from "./modules/profile/profile.routes";
import bookingRoutes from "./modules/booking/booking.routes";
import reviewRoutes from "./modules/review/review.routes";
import customerSupportRoutes from "./modules/cutomerSupport/customerSupport.routes";
import paymentRoutes from "./modules/payment/payment.routes";
//import adminRoutes from "./modules/admin/admin.router";
//import disputeRoutes from "./modules/dispute/dispute.routes";
import ratingRoutes from "./modules/rating/rating.routes";
import cors from "cors";
import { webhook } from "./config/stripe";
import cron from "node-cron";
import { processPendingPayouts } from "./services/scheduledPayout.service";
import { autoReactivateVehicles } from "./services/vehicleReactivation.service";

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
app.use(express.urlencoded({ extended: true }));

connectDB();
app.use("/auth", authRoutes);
app.use("/profile", profileRoutes);
app.use("/bookings", bookingRoutes);
app.use("/vehicles", vehicleRoutes);
app.use("/reviews", reviewRoutes);
app.use("/customer-support", customerSupportRoutes);
app.use("/payment", paymentRoutes);
//app.use("/admin", adminRoutes);
//app.use("/disputes", disputeRoutes);
app.use("/ratings", ratingRoutes);

// ========================
// Initialize Cron Jobs
// ========================
// Run every hour to check for pending payouts
// Cron format: "minute hour day month day-of-week"
// "0 * * * *" means: at minute 0 of every hour
cron.schedule("0 * * * *", async () => {
  console.log("🔄 Running scheduled payout cron job...");
  try {
    await processPendingPayouts();
  } catch (error: any) {
    console.error("❌ Error in scheduled payout cron job:", error.message);
  }
});

// Run every 30 minutes to check for vehicles that need auto-reactivation
cron.schedule("*/30 * * * *", async () => {
  console.log("🔄 Running vehicle auto-reactivation check...");
  try {
    await autoReactivateVehicles();
  } catch (error: any) {
    console.error("❌ Error in vehicle reactivation cron job:", error.message);
  }
});

console.log("✅ Scheduled cron jobs initialized (payouts: hourly, vehicle reactivation: every 30 minutes)");

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
