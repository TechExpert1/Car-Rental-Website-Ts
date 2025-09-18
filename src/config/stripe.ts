import { Request, Response } from "express";
import Booking from "../modules/booking/booking.model";
import Vehicle from "../modules/vehicle/vehicle.model";
import Stripe from "stripe";
import { Document } from "mongoose";
import AuthRequest from "../middlewares/userAuth";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
// ========================
// Create Checkout Session
// ========================
export const createSession = async (req: AuthRequest, res: Response) => {
  try {
    const { vehicle, pickupDate, dropoffDate, totalAmount } = req.body as {
      vehicle: string;
      pickupDate: string;
      dropoffDate: string;
      totalAmount: number;
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
      vehicle,
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
  const sig = req.headers["stripe-signature"] as string | undefined;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

  let event: Stripe.Event;
  console.log("entered in webhook ::::::::::");
  try {
    event = stripe.webhooks.constructEvent(req.body, sig!, endpointSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        session.payment_intent as string
      );

      // Update booking
      await Booking.findByIdAndUpdate(bookingId, {
        paymentIntentId: paymentIntent.id,
        paymentStatus: "succeeded",
        bookingStatus: "completed",
      });
    } catch (err: any) {
      console.error("Booking update error:", err.message);
    }
  }

  res.json({ received: true });
};
