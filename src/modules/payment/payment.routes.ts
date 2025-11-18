import express from "express";
import {
  connectStripe,
  payoutToExternalAccount,
  getAccountStatus,
  handleConnectedAccountWebhook,
} from "./payment.controller";
import { userAuth, hostAuth } from "../../middlewares";


const router = express.Router();

// Connect Stripe account (create or continue onboarding)
router.post("/connect-stripe", hostAuth, connectStripe);

// Payout to external connected account
router.post("/payout", hostAuth, payoutToExternalAccount);

// Get account status for logged in user
router.get("/account-status", hostAuth, getAccountStatus);

// Note: Webhook route is handled in server.ts with raw body middleware
//router.post("/webhook", express.raw({ type: 'application/json' }), handleConnectedAccountWebhook );
export default router;
