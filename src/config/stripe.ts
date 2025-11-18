import { Request, Response } from "express";
import Booking from "../modules/booking/booking.model";
import Vehicle from "../modules/vehicle/vehicle.model";
import Stripe from "stripe";
import { Document } from "mongoose";
import AuthRequest from "../middlewares/userAuth";
import userModel from "../modules/auth/auth.model";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
// ========================
// Create Checkout Session
// ========================
export const createSession = async (req: AuthRequest, res: Response) => {
  try {
    const { vehicle, pickupDate, totalDays, dropoffDate, host, totalAmount } =
      req.body as {
        vehicle: string;
        pickupDate: string;
        dropoffDate: string;
        totalAmount: number;
        totalDays: number;
        host: string;
      };

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

    // 5. If Stripe returned payment_intent (sometimes available immediately)
    if (session.payment_intent) {
      booking.paymentIntentId = session.payment_intent as string;
      await booking.save();
    }

    res.json({ sessionUrl: session.url });
  } catch (error: any) {
    console.error("Session creation error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// ========================
// Stripe Webhook
// ========================
export const webhook = async (req: Request, res: Response) => {
  console.log("entered in webhook ::::::::::");
  console.log(process.env.STRIPE_WEBHOOK_SECRET);
  const sig = req.headers["stripe-signature"] as string | undefined;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig!, endpointSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  console.log("Check 2::::::::::");
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;
    console.log("bookingId ::::::: ", bookingId);
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        session.payment_intent as string
      );

      // Update booking
      await Booking.findByIdAndUpdate(bookingId, {
        paymentIntentId: paymentIntent.id,
        paymentStatus: "succeeded",
        bookingStatus: "active",
      });
    } catch (err: any) {
      console.error("Booking update error:", err.message);
    }
  }

  res.json({ received: true });
};

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

