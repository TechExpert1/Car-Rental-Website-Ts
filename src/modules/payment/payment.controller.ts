import { Request, Response } from "express";
import { stripe } from "../../config/stripe";
import User from "../auth/auth.model";
import AuthRequest from "../../middlewares/userAuth";

// ========================
// Connect Stripe Account
// ========================
export const connectStripe = async (req: Request, res: Response) => {
  try {
    
    const { email } = req.body;
    // extract userid from jwt token
    const userId = (req as any) .user?.id;


    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (!existingUser) {
      return res.status(404).json({ error: "No such user exists" });
    }

    if(existingUser.role !== "host"){
      return res.status(400).json({ error: "Only hosts can connect a stripe account" });
    }

    // Check if user already has a fully configured connected account
    if (
      existingUser.connected_acc_id !== "none" &&
      existingUser.connected_external_acc_id !== "none" &&
      existingUser.payouts_enabled === true
    ) {
      return res.status(400).json({
        error: "You already have a connected account",
        connectedAccountId: existingUser.connected_acc_id,
        connectedExternalAccountId: existingUser.connected_external_acc_id,
      });
    }

    // If account exists but onboarding is incomplete
    if (
      existingUser.connected_acc_id !== "none" &&
      (existingUser.connected_external_acc_id === "none" ||
        existingUser.payouts_enabled === false)
    ) {
      const accountLink = await generateAccountLink(
        //existingUser.connected_acc_id
        existingUser.connected_acc_id as any
      );

      if (!accountLink || accountLink.error) {
        return res.status(500).json({
          error: "Failed to generate account link",
          details: accountLink?.error,
        });
      }

      return res.status(200).json({
        message: "Continue account onboarding",
        connectedAccountId: existingUser.connected_acc_id,
        connectedExternalAccountId: existingUser.connected_external_acc_id,
        onboardingUrl: accountLink.url,
      });
    }

    // Create new connected account
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
      metadata: {
        email: email,
      },
    });

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      //refresh_url: `${process.env.SERVER_URL}/api/payment/connect-stripe`,
      //return_url: `${process.env.CLIENT_URL}/dashboard?stripe_connect=success`,
      refresh_url: "https://www.youtube.com",
      return_url: "https://www.facebook.com",
      type: "account_onboarding",
    });

    // Update user with connected account ID
    await User.findOneAndUpdate(
      { email: email },
      {
        connected_acc_id: account.id,
      },
      { new: true }
    );

    return res.status(200).json({
      message: "Connected account created successfully",
      connectedAccountId: account.id,
      onboardingUrl: accountLink.url,
    });
  } catch (error: any) {
    console.error("Error creating connected account:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

// ========================
// Generate Account Link
// ========================
export const generateAccountLink = async (connectedAccountId: string) => {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: connectedAccountId,
      refresh_url: "https://www.youtube.com",
      return_url: "https://www.facebook.com",
      type: "account_onboarding",
    });

    return {
      url: accountLink.url,
    };
  } catch (error: any) {
    return { error: error.message };
  }
};

// ========================
// Payout to External Account
// ========================
export const payoutToExternalAccount = async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    const userId = (req as any) .user?.id;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Valid amount is required" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.connected_acc_id || user.connected_acc_id === "none") {
      return res.status(400).json({
        error: "User does not have a connected account",
      });
    }

    if (
      !user.connected_external_acc_id ||
      user.connected_external_acc_id === "none"
    ) {
      return res.status(400).json({
        error: "User does not have an external account configured",
      });
    }

    if (!user.payouts_enabled) {
      return res.status(400).json({
        error: "Payouts are not enabled for this account",
      });
    }

    // Create payout to external account
    const payout = await stripe.payouts.create(
      {
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        destination: user.connected_external_acc_id,
      },
      {
        stripeAccount: user.connected_acc_id,
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "Payout created successfully. The amount will be transferred within 2-3 business days.",
      payout: {
        id: payout.id,
        amount: payout.amount / 100,
        currency: payout.currency,
        status: payout.status,
        arrival_date: payout.arrival_date,
      },
    });
  } catch (error: any) {
    console.error("Error creating payout:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

// ========================
// Webhook Handler for Connected Accounts
// ========================
export const handleConnectedAccountWebhook = async (
  req: Request,
  res: Response
) => {
  const sig = req.headers["stripe-signature"] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

  let event;
  console.log(" webhook secret function called ..... ");

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (error: any) {
    console.error("Webhook signature verification failed:", error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  // Handle different event types
  switch (event.type) {
    case "account.updated":
      await handleAccountUpdated(event.data.object);
      break;

    case "account.external_account.created":
      console.log("External account created:", event.data.object);
      console.log("For account:", event.data.object.account);
      console.log("External account id:", event.data.object.id);
      await handleExternalAccountCreated(event.data.object);
      break;

    case "account.external_account.updated":
      await handleExternalAccountUpdated(event.data.object);
      break;

    case "capability.updated":
      await handleCapabilityUpdated(event.data.object);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return res.json({ received: true });
};

// ========================
// Handle Account Updated Event
// ========================
const handleAccountUpdated = async (account: any) => {
  try {
    console.log("Account updated:", account.id);

    const user = await User.findOne({ connected_acc_id: account.id });

    if (!user) {
      console.log("User not found for account:", account.id);
      return;
    }

    // Check if payouts are enabled
    const payoutsEnabled =
      account.capabilities?.transfers === "active" &&
      account.charges_enabled &&
      account.payouts_enabled;

    // Get external account if available
    const externalAccountId =
      account.external_accounts?.data?.[0]?.id || "none";

    // Update user record
    await User.findOneAndUpdate(
      { connected_acc_id: account.id },
      {
        connected_external_acc_id: externalAccountId,
        payouts_enabled: payoutsEnabled,
      },
      { new: true }
    );

    console.log("User updated successfully:", user.email);
  } catch (error: any) {
    console.error("Error handling account update:", error.message);
  }
};

// ========================
// Handle External Account Created Event
// ========================
const handleExternalAccountCreated = async (externalAccount: any) => {
  try {
    console.log("External account created:", externalAccount.id);
    console.log("For account:", externalAccount.account);

    // Update user with external account ID
    const user = await User.findOneAndUpdate(
      { connected_acc_id: externalAccount.account },
      {
        connected_external_acc_id: externalAccount.id,
      },
      { new: true }
    );

    if (user) {
      console.log(
        "User external account updated successfully:",
        user.email,
        "External Account:",
        externalAccount.id
      );
    } else {
      console.log("User not found for account:", externalAccount.account);
    }
  } catch (error: any) {
    console.error("Error handling external account creation:", error.message);
  }
};

// ========================
// Handle External Account Updated Event
// ========================
const handleExternalAccountUpdated = async (externalAccount: any) => {
  try {
    console.log("External account updated:", externalAccount.id);

    const user = await User.findOne({
      connected_acc_id: externalAccount.account,
    });

    if (user) {
      console.log("External account updated for user:", user.email);
    }
  } catch (error: any) {
    console.error("Error handling external account update:", error.message);
  }
};


// ========================
// Handle Capability Updated Event
// ========================
const handleCapabilityUpdated = async (capability: any) => {
  try {
    console.log("Capability updated:", capability.id);
    console.log("Status:", capability.status);
    console.log("Account:", capability.account);

    // Fetch the full account to check all capabilities
    const account = await stripe.accounts.retrieve(capability.account);

    const payoutsEnabled =
      account.capabilities?.transfers === "active" &&
      account.charges_enabled &&
      account.payouts_enabled;

    await User.findOneAndUpdate(
      { connected_acc_id: capability.account },
      {
        payouts_enabled: payoutsEnabled,
      },
      { new: true }
    );

    console.log("User payouts_enabled updated");
  } catch (error: any) {
    console.error("Error handling capability update:", error.message);
  }
};

// ========================
// Get Account Status
// ========================
export const getAccountStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.connected_acc_id || user.connected_acc_id === "none") {
      return res.status(200).json({
        hasAccount: false,
        message: "No connected account found",
      });
    }

    // Fetch account details from Stripe
    const account = await stripe.accounts.retrieve(user.connected_acc_id);

    return res.status(200).json({
      hasAccount: true,
      connectedAccountId: user.connected_acc_id,
      connectedExternalAccountId: user.connected_external_acc_id,
      payoutsEnabled: user.payouts_enabled,
      chargesEnabled: account.charges_enabled,
      detailsSubmitted: account.details_submitted,
      totalRevenue: user.total_revenue,
    });
  } catch (error: any) {
    console.error("Error fetching account status:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

// ========================
// Create Payment Intent (to Admin Account)
// ========================
export const createPaymentIntent = async (req: Request, res: Response) => {
  try {
    const { userId, amount, currency, paymentMethodId } = req.body;

    // Validation
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Valid amount is required" });
    }

    if (!currency) {
      return res.status(400).json({ error: "Currency is required" });
    }

    if (!paymentMethodId) {
      return res.status(400).json({ error: "Payment method ID is required" });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Convert amount to cents
    const amountInCents = Math.round(amount * 100);

    // Create PaymentIntent (payment goes to admin account)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      payment_method: paymentMethodId,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
      metadata: {
        userId: userId,
        email: user.email,
        totalAmount: amount.toString(),
        note: "Payment to admin account",
      },
    });

    return res.status(200).json({
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: amount,
      currency: currency,
      message: "Payment intent created successfully",
    });
  } catch (error: any) {
    console.error("Error creating payment intent:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

// ========================
// Transfer from Admin to Connected Account
// ========================
export const transferToConnectedAccount = async (
  req: Request,
  res: Response
) => {
  try {
    const { userId, amount } = req.body;

    // Validation
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Valid amount is required" });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user has connected account
    if (!user.connected_acc_id || user.connected_acc_id === "none") {
      return res.status(400).json({
        error: "User does not have a connected Stripe account",
      });
    }

    // Convert amount to cents
    const amountInCents = Math.round(amount * 100);

    // Create transfer from admin to connected account
    const transfer = await stripe.transfers.create({
      amount: amountInCents,
      currency: "usd",
      destination: user.connected_acc_id,
      description: `Payout to ${user.email}`,
      metadata: {
        userId: userId,
        email: user.email,
      },
    });

    // Update user's total revenue
    user.total_revenue = (user.total_revenue || 0) + amount;
    await user.save();

    return res.status(200).json({
      success: true,
      transferId: transfer.id,
      amount: amount,
      destination: user.connected_acc_id,
      message: "Amount successfully transferred to connected account",
    });
  } catch (error: any) {
    console.error("Error transferring to connected account:", error.message);
    return res.status(500).json({ error: error.message });
  }
};
