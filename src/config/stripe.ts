import { Request, Response } from "express";
import Booking from "../modules/booking/booking.model";
import Vehicle from "../modules/vehicle/vehicle.model";
import Stripe from "stripe";
import { Document } from "mongoose";
import AuthRequest from "../middlewares/userAuth";
import userModel from "../modules/auth/auth.model";
import {
  handleAccountUpdated,
  handleExternalAccountCreated,
  handleExternalAccountUpdated,
  handleCapabilityUpdated,
} from "../modules/payment/payment.controller";
import { createNotification } from "../modules/notifications/notification.service";
import { transporter } from "./nodemailer";

// Initialize Stripe - check if key exists
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is not set in environment variables');
  console.error('⚠️ Stripe features will not work. Please set STRIPE_SECRET_KEY in Railway dashboard or .env');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_missing');
// ========================
// Create Checkout Session
// ========================
export const createSession = async (req: AuthRequest, res: Response) => {
  try {
    console.log("========== CREATE SESSION DEBUG ==========");
    const { vehicle, pickupDate, totalDays, dropoffDate, host, totalAmount } =
      req.body as {
        vehicle: string;
        pickupDate: string;
        dropoffDate: string;
        totalAmount: number;
        totalDays: number;
        host: string;
      };

    console.log("📝 Received booking request:", { vehicle, host, totalAmount, totalDays });

    // 1. Get vehicle info
    const vehicleDoc = await Vehicle.findById(vehicle).lean<
      { name: string } & Document
    >();
    if (!vehicleDoc) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    // 2. Create booking in DB
    const booking = await Booking.create({
      user: req.user?.id,
      host,
      vehicle,
      totalDays,
      pickupDate,
      dropoffDate,
      totalAmount,
      paymentStatus: "pending",
      bookingStatus: "in-progress",
    });

    console.log("✅ Booking created in DB:", {
      bookingId: booking._id.toString(),
      userId: req.user?.id,
      hostId: host,
    });

    // 3. Stripe line item
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: "usd",
          product_data: { name: vehicleDoc.name },
          unit_amount: totalAmount * 100,
        },
        quantity: 1,
      },
    ];

    // 4. Create Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: process.env.STRIPE_SUCCESS_REDIRECT as string,
      cancel_url: process.env.STRIPE_FAILURE_REDIRECT as string,
      metadata: {
        userId: req.user?.id?.toString() || "",
        bookingId: booking._id.toString(),
      },
    });

    console.log("✅ Stripe session created:", {
      sessionId: session.id,
      bookingId: booking._id.toString(),
      metadata: session.metadata,
    });

    // 5. If Stripe returned payment_intent (sometimes available immediately)
    if (session.payment_intent) {
      booking.paymentIntentId = session.payment_intent as string;
      await booking.save();
      console.log("💳 Payment intent saved:", session.payment_intent);
    }

    console.log("========== END CREATE SESSION DEBUG ==========");
    res.json({ sessionUrl: session.url });
  } catch (error: any) {
    console.error("❌ Session creation error:", error.message);
    console.error("❌ Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ----------------------------
// Platform / Checkout Webhook
// ----------------------------
export const platformWebhook = async (req: Request, res: Response) => {
  try {
    console.log("========== PLATFORM WEBHOOK CALLED ==========");

    const sig = req.headers["stripe-signature"] as string | undefined;
    const endpointSecret = process.env.STRIPE_PLATFORM_WEBHOOK_SECRET as string;

    if (!sig) {
      console.error("❌ No stripe-signature header found");
      return res.status(400).send("No stripe-signature header");
    }

    if (!endpointSecret) {
      console.error("❌ STRIPE_PLATFORM_WEBHOOK_SECRET not configured");
      return res.status(400).send("Platform webhook secret not configured");
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      console.log("✅ Platform webhook signature verified");
    } catch (err: any) {
      console.error("❌ Platform webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log("📝 Platform event type:", event.type);

    // Handle checkout.session.completed events (booking payments)
    if (event.type === "checkout.session.completed") {
      console.log("🎫 ✅ CHECKOUT SESSION COMPLETED");
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.bookingId;

      if (!bookingId) {
        console.error("❌ No bookingId in session metadata!");
        res.json({ received: true, error: "No bookingId in metadata" });
        return;
      }

      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          session.payment_intent as string
        );

        const existingBooking = await Booking.findById(bookingId);
        if (!existingBooking) {
          console.error("❌ Booking not found with ID:", bookingId);
          res.json({ received: true, error: "Booking not found" });
          return;
        }

        const updatedBooking = await Booking.findByIdAndUpdate(
          bookingId,
          {
            paymentIntentId: paymentIntent.id,
            paymentStatus: "succeeded",
            bookingStatus: "active",
          },
          { new: true }
        );

        console.log("✅ Booking marked as paid and active:", bookingId);

        // Send notification and email to host about new booking
        if (updatedBooking) {
          try {
            const [renter, host, vehicle] = await Promise.all([
              userModel.findById(updatedBooking.user),
              userModel.findById(updatedBooking.host),
              Vehicle.findById(updatedBooking.vehicle)
            ]);

            const renterName = renter?.name || renter?.username || 'A guest';
            const vehicleName = vehicle?.name || 'your vehicle';
            const hostIdStr = updatedBooking.host.toString();

            // Format dates nicely
            const formatDate = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            const pickupStr = formatDate(new Date(updatedBooking.pickupDate));
            const dropoffStr = formatDate(new Date(updatedBooking.dropoffDate));
            const totalDays = updatedBooking.totalDays;
            const totalAmount = updatedBooking.totalAmount;

            // Send in-app notification to host
            await createNotification(
              hostIdStr,
              'new_booking',
              '🎉 New Booking Received!',
              `Great news! ${renterName} has booked your ${vehicleName} from ${pickupStr} to ${dropoffStr} (${totalDays} day${totalDays > 1 ? 's' : ''}). Total earnings: $${totalAmount.toFixed(2)}`,
              {
                bookingId: bookingId,
                vehicleId: updatedBooking.vehicle.toString(),
                vehicleName,
                guestName: renterName,
                pickupDate: updatedBooking.pickupDate,
                dropoffDate: updatedBooking.dropoffDate,
                totalAmount,
                totalDays,
              }
            );
            console.log(`📧 New booking notification sent to host for booking ${bookingId}`);

            // Send email to host
            if (host?.email) {
              const emailHtml = `
                <div style="font-family: Arial, sans-serif; background:#f9f9f9; padding:20px;">
                  <div style="max-width:600px; margin:auto; background:#fff; padding:30px; border-radius:12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align:center; margin-bottom:20px;">
                      <h1 style="color:#2976BA; margin:0;">🎉 New Booking!</h1>
                    </div>
                    <p style="font-size:16px; color:#333;">Hi ${host.name || host.username || 'there'},</p>
                    <p style="font-size:16px; color:#333;">Great news! You have a new booking for your vehicle.</p>
                    
                    <div style="background:#f8f9fa; padding:20px; border-radius:8px; margin:20px 0;">
                      <h3 style="color:#2976BA; margin-top:0;">📋 Booking Details</h3>
                      <table style="width:100%; font-size:14px; color:#555;">
                        <tr><td style="padding:8px 0;"><strong>Vehicle:</strong></td><td>${vehicleName}</td></tr>
                        <tr><td style="padding:8px 0;"><strong>Guest:</strong></td><td>${renterName}</td></tr>
                        <tr><td style="padding:8px 0;"><strong>Pickup:</strong></td><td>${pickupStr}</td></tr>
                        <tr><td style="padding:8px 0;"><strong>Return:</strong></td><td>${dropoffStr}</td></tr>
                        <tr><td style="padding:8px 0;"><strong>Duration:</strong></td><td>${totalDays} day${totalDays > 1 ? 's' : ''}</td></tr>
                        <tr><td style="padding:8px 0;"><strong>Total Earnings:</strong></td><td style="color:#28a745; font-weight:bold;">$${totalAmount.toFixed(2)}</td></tr>
                      </table>
                    </div>
                    
                    <p style="font-size:14px; color:#666;">Please ensure your vehicle is ready for pickup on the scheduled date.</p>
                    
                    <div style="text-align:center; margin-top:30px;">
                      <p style="font-size:12px; color:#999;">Thank you for being a valued host!</p>
                    </div>
                  </div>
                </div>
              `;

              await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: host.email,
                subject: `🎉 New Booking: ${renterName} booked your ${vehicleName}`,
                html: emailHtml,
              });
              console.log(`📨 New booking email sent to host ${host.email}`);
            }

            // Send confirmation notification to customer
            await createNotification(
              updatedBooking.user.toString(),
              'booking_confirmed',
              '✅ Booking Confirmed!',
              `You're all set! Your booking for ${vehicleName} is confirmed. Pickup: ${pickupStr}, Return: ${dropoffStr}. Total: $${totalAmount.toFixed(2)}. Have a great trip!`,
              {
                bookingId: bookingId,
                vehicleId: updatedBooking.vehicle.toString(),
                vehicleName,
                pickupDate: updatedBooking.pickupDate,
                dropoffDate: updatedBooking.dropoffDate,
                totalAmount,
                totalDays,
              }
            );
            console.log(`📧 Booking confirmation sent to customer for booking ${bookingId}`);

            // Send confirmation email to customer
            if (renter?.email) {
              const customerEmailHtml = `
                <div style="font-family: Arial, sans-serif; background:#f9f9f9; padding:20px;">
                  <div style="max-width:600px; margin:auto; background:#fff; padding:30px; border-radius:12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align:center; margin-bottom:20px;">
                      <h1 style="color:#28a745; margin:0;">✅ Booking Confirmed!</h1>
                    </div>
                    <p style="font-size:16px; color:#333;">Hi ${renter.name || renter.username || 'there'},</p>
                    <p style="font-size:16px; color:#333;">Your booking has been confirmed!</p>
                    
                    <div style="background:#f8f9fa; padding:20px; border-radius:8px; margin:20px 0;">
                      <h3 style="color:#2976BA; margin-top:0;">🚗 Trip Details</h3>
                      <table style="width:100%; font-size:14px; color:#555;">
                        <tr><td style="padding:8px 0;"><strong>Vehicle:</strong></td><td>${vehicleName}</td></tr>
                        <tr><td style="padding:8px 0;"><strong>Pickup:</strong></td><td>${pickupStr}</td></tr>
                        <tr><td style="padding:8px 0;"><strong>Return:</strong></td><td>${dropoffStr}</td></tr>
                        <tr><td style="padding:8px 0;"><strong>Duration:</strong></td><td>${totalDays} day${totalDays > 1 ? 's' : ''}</td></tr>
                        <tr><td style="padding:8px 0;"><strong>Total Paid:</strong></td><td style="font-weight:bold;">$${totalAmount.toFixed(2)}</td></tr>
                      </table>
                    </div>
                    
                    <div style="background:#e8f5e9; padding:15px; border-radius:8px; margin:20px 0;">
                      <p style="margin:0; color:#2e7d32; font-size:14px;">💡 <strong>Tip:</strong> Remember to arrive on time and bring a valid driver's license.</p>
                    </div>
                    
                    <p style="font-size:14px; color:#666;">Have a great trip!</p>
                  </div>
                </div>
              `;

              await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: renter.email,
                subject: `✅ Booking Confirmed: ${vehicleName} - ${pickupStr}`,
                html: customerEmailHtml,
              });
              console.log(`📨 Booking confirmation email sent to customer ${renter.email}`);
            }
          } catch (notifError) {
            console.error('Failed to send booking notifications:', notifError);
            // Don't fail the webhook response if notification fails
          }
        }
      } catch (err: any) {
        console.error("❌ Error during booking update:", err.message);
      }

      res.json({ received: true });
      return;
    }

    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.log("✅ PaymentIntent succeeded:", pi.id, "amount:", pi.amount);
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.log("❌ PaymentIntent failed:", pi.id, "last_payment_error:", pi.last_payment_error);
        break;
      }

      default:
        console.log(`Unhandled platform event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error("❌ CRITICAL PLATFORM WEBHOOK ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ----------------------------
// Connect / Connected-Account Webhook
// ----------------------------
export const connectWebhook = async (req: Request, res: Response) => {
  try {
    console.log("========== CONNECT WEBHOOK CALLED ==========");

    const sig = req.headers["stripe-signature"] as string | undefined;
    const endpointSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET as string;

    if (!sig) {
      console.error("❌ No stripe-signature header found");
      return res.status(400).send("No stripe-signature header");
    }

    if (!endpointSecret) {
      console.error("❌ STRIPE_CONNECT_WEBHOOK_SECRET not configured");
      return res.status(400).send("Connect webhook secret not configured");
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      console.log("✅ Connect webhook signature verified");
    } catch (err: any) {
      console.error("❌ Connect webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const connectedAccountId = req.headers["stripe-account"] as string | undefined;
    if (connectedAccountId) {
      console.log("Event received for connected account:", connectedAccountId);
    }

    switch (event.type) {
      case "account.updated":
        console.log("👤 Account updated event");
        await handleAccountUpdated(event.data.object);
        break;

      case "account.external_account.created":
        console.log("💳 External account created event");
        await handleExternalAccountCreated(event.data.object);
        break;

      case "account.external_account.updated":
        console.log("💳 External account updated event");
        await handleExternalAccountUpdated(event.data.object);
        break;

      case "capability.updated":
        console.log("⚙️ Capability updated event");
        await handleCapabilityUpdated(event.data.object);
        break;

      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.log("✅ Connected account PaymentIntent succeeded:", pi.id);
        break;
      }

      default:
        console.log(`Unhandled connect event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error("❌ CRITICAL CONNECT WEBHOOK ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Backwards compatible alias
export const webhook = platformWebhook;

export const createConnectedAccount = async (req: Request, res: Response) => {
  const { email } = req.body;
  console.log("email ", email);
  let account, accountLink;
  try {

    const existingUser = await userModel.findOne({ email: email.toLowerCase() });

    if (!existingUser) {
      throw new Error('No such user exists');
    }

    if (existingUser.connected_acc_id !== 'none' && existingUser.connected_external_acc_id !== 'none' && existingUser.payouts_enabled === true) {
      throw new Error('You already have a connected account');
    }

    if (existingUser.connected_acc_id !== 'none' && (existingUser.connected_external_acc_id === 'none' || existingUser.payouts_enabled === false)) {
      const response = await generateAccountLink(existingUser.connected_acc_id || '');
      if (response?.error) {
        return response;
      }

      return {
        message: 'Connect account created',
        Connected_accountId: existingUser.connected_acc_id,
        Connected_externalAccountId: existingUser.connected_external_acc_id,
        onboardingUrl: response.onboardingUrl,
      };
    } else {
      try {
        // enable transfers also
        console.log("Creating new account");
        account = await stripe.accounts.create({
          type: "express",
          country: "US",
          capabilities: {
            transfers: { requested: true },
            card_payments: { requested: true },
            // legacy_payments : {requested:true}
          },
          metadata: {
            email: email,
          },
        });
        accountLink = await stripe.accountLinks.create({
          account: account.id,
          refresh_url: process.env.SERVER_URL + "/payments/create-connected-account",
          return_url: "https://www.example.com",
          type: "account_onboarding",
        });

        // console.log("accountLink", accountLink);
        // console.log("account", account);
        // console.log("account.id", account.id);
        console.log("external_accounts", account.external_accounts);
        if (accountLink.url) {
          //log the externnal acc id
          console.log("account.external_accounts", account.external_accounts);
          await userModel.findOneAndUpdate(
            { email: email },
            {
              connected_acc_id: account.id,
              connected_external_acc_id: account.external_accounts ? account.external_accounts.data[0]?.id : null,
              payments_enabled: true,
            },
            { new: true }
          );
        }

      } catch (err:any) {
        const error = new Error(err);
        return {
          error: error.message,
        };
      }

      return { accountId: account.id, onBoardingUrl: accountLink.url , externalAccountId: account.external_accounts};
    }
  } catch (err:any) {
    const error = new Error(err);
    return {
      error: error.message,
    };
  }
}



  export const generateAccountLink = async (connected_acc_id: string) => {
    try {
          const  accountLink = await stripe.accountLinks.create({
          account: connected_acc_id,
          refresh_url: process.env.SERVER_URL + "/payments/create-connected-account",
          return_url: "https://www.example.com",
          type: "account_onboarding",
        });

      return {
        onboardingUrl: accountLink.url,
      };
    } catch (error) {
      return { error: error };
    }
  }

      export const payoutTheAmount = async (req: Request, res: Response) => {
      try {
        const { connected_external_acc_id, connected_acc_id, amount } = req.body;

        if(!connected_external_acc_id){
          throw new Error('External account id is required');
        }
        if(!connected_acc_id){
          throw new Error('Connected account id is required');
        }
        if(!amount){
          throw new Error('Amount is required');
        }
        // // store the external account id in user document 
        // await this.userModel.findOneAndUpdate(
        //   { connected_acc_id: connected_acc_id },
        //   {
        //     connected_external_acc_id: connected_external_acc_id,
        //   },
        //   { new: true }
        // );

        console.log("connected_external_acc_id", connected_external_acc_id);
        console.log("connected_acc_id", connected_acc_id);

        const payout = await stripe.payouts.create(
          {
            amount: Number((amount * 100).toFixed(0)),
            currency: "usd",
            destination: connected_external_acc_id,
          },
          {
            stripeAccount: connected_acc_id,
          }
        );
        return {
          success: true,
          message: 'Payout created successfully. The amount will be transferred into your account within 2-3 business days.',
          payout: payout,
        };
      } catch (err:any) {
        const error = new Error(err);
        return {
          error: error.message,
        };
      }
    };



    // full amount goes to the admin accournt

    export const createPaymentIntent = async (req: Request, res: Response) => {
  try {
    const { userId, amount, currency, paymentMethodId } = req.body;
    const findUser = await userModel.findById(userId);

    if (!findUser) {
      throw new Error("User not found");
    }

    console.log("amount ", amount);

    const amountInCents = Math.round(amount * 100);

    // Create PaymentIntent for the admin (no transfer to connected account)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      payment_method: paymentMethodId,
      metadata: {
        userId,
        email: findUser.email,
        user_connected_acc_id: findUser.connected_acc_id || '',
        totalAmount: amount,
        note: "Full payment goes to admin account",
      },
      // confirm: true, // uncomment if you want to confirm instantly
    });

    console.log("paymentIntent", paymentIntent);

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      totalAmount: amount,
      message: "Payment intent created successfully. Full amount goes to admin.",
    });
  } catch (err: any) {
    console.error("Error creating payment intent:", err.message);
    return res.status(500).json({ error: err.message });
  }
};


export const sendAdminToConnectedAccount = async (req: Request, res: Response) => {
  try {
    const { userId, amount, currency, reason } = req.body;

    // Find the user who will receive the payout
    const findUser = await userModel.findById(userId);
    if (!findUser) {
      throw new Error("User not found");
    }

    if (!findUser.connected_acc_id) {
      throw new Error("User does not have a connected Stripe account");
    }

    const amountInCents = Math.round(amount * 100);

    // Create a transfer from admin (platform) to provider's connected account
    const transfer = await stripe.transfers.create({
      amount: amountInCents,
      currency,
      destination: findUser.connected_acc_id,
      description: reason || "Payout from admin to connected account",
      metadata: {
        userId,
        reason,
      },
    });

    console.log("Transfer successful:", transfer.id);
    findUser.total_revenue = findUser.total_revenue + amount;
    await findUser.save();

    return res.status(200).json({
      success: true,
      transferId: transfer.id,
      amount: amount,
      currency,
      destination: findUser.connected_acc_id,
      message: "Amount successfully transferred to connected account",
    });
  } catch (err: any) {
    console.error("Error sending payout:", err.message);
    return res.status(500).json({ error: err.message });
  }
};




//     export const createPaymentIntent = async (req: Request, res: Response) => {
//       try {
//         const { userId, amount, currency, paymentMethodId } = req.body;
//         const findUser = await userModel.findById(userId);
//         if (!findUser) {
//           throw new Error('User not found');
//         }
//         if (!findUser.connected_acc_id) {
//           throw new Error('User does not have a connected Stripe account');
//         }


//   console.log("amount ", amount);

//   // Calculate the 20% platform fee (admin's share)
//   const platformFeePercentage = 0.20; // 20%
//   const amountInCents = amount * 100;
//   const platformFeeAmount = Math.round(amountInCents * platformFeePercentage);
//   const providerAmount = amountInCents - platformFeeAmount;

//   console.log(`Total amount: $${amount}`);
//   console.log(`Platform fee (20%): $${platformFeeAmount / 100}`);
//   console.log(`Provider receives: $${providerAmount / 100}`);

//   // Create a PaymentIntent with application fee
//   const paymentIntent = await stripe.paymentIntents.create({
//     amount: amountInCents, // Total amount in cents
//     currency: currency,
//     application_fee_amount: platformFeeAmount, // 20% goes to platform (admin)
//     transfer_data: {
//       destination: findUser.connected_acc_id, // 80% goes to service provider
//     },
//     metadata: {
//       userId: userId,
//       totalAmount: amount,
//       platformFee: platformFeeAmount / 100,
//       providerAmount: providerAmount / 100,
//     },
//     payment_method: paymentMethodId,
//     // confirm: true, // Uncomment to confirm immediately
//   });

//   console.log("paymentIntent", paymentIntent);

//   // Optional: Update user earnings based on their share (80%)
//   // findUser.total_earnings = parseFloat(findUser.total_earnings.toString()) + (providerAmount / 100);
//   // findUser.allowed_withdrawl_balance = parseFloat(findUser.allowed_withdrawl_balance.toString()) + (providerAmount / 100);
//   // await findUser.save();

//   return {
//     clientSecret: paymentIntent.client_secret,
//     paymentIntentId: paymentIntent.id,
//     totalAmount: amount,
//     platformFee: platformFeeAmount / 100,
//     providerAmount: providerAmount / 100,
//   };
// } catch (err:any) {
//   const error = new Error(err);
//   return {
//     error: error.message,
//   };
// }
// }


// -------- new stripe logic using connected accounts

