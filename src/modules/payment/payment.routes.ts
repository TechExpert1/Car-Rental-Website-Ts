import express from "express";
import {
  connectStripe,
  payoutToExternalAccount,
  getAccountStatus,
  handleConnectedAccountWebhook,
  getStripeOAuthUrl,
  connectStripeOAuth,
  refreshOnboardingLink,
} from "./payment.controller";
import { userAuth, hostAuth } from "../../middlewares";


const router = express.Router();

// ========================
// Express Account Flow (Recommended)
// ========================
// Start/Continue Stripe Connect onboarding
router.post("/connect-stripe", hostAuth, connectStripe);

// Refresh onboarding link if expired
router.post("/refresh-onboarding", hostAuth, refreshOnboardingLink);

// Get account status for logged in user
router.get("/account-status", hostAuth, getAccountStatus);

// ========================
// OAuth Flow (Alternative)
// ========================
router.get("/stripe-oauth-url", hostAuth, getStripeOAuthUrl);
router.post("/connect-stripe-oauth", hostAuth, connectStripeOAuth);

// ========================
// Payouts
// ========================
router.post("/payout", hostAuth, payoutToExternalAccount);

// Note: Webhook route is handled in server.ts with raw body middleware
//router.post("/webhook", express.raw({ type: 'application/json' }), handleConnectedAccountWebhook );
export default router;
