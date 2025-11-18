import { Request, Response } from "express";
import {
  handleUpdateBooking,
  handleCancelBooking,
  handleGetAllBooking,
  handleUserBookingStats,
  handleUserMonthlyRevenue,
} from "./booking.service";
import Vehicle from "../vehicle/vehicle.model";
import Booking from "./booking.model";
import { stripe } from "../../config/stripe";
import { refundPayment } from "../../utils/booking";
import AuthRequest from "../../middlewares/userAuth";
import { calculateSecurityDeposit } from "../../services/securityDeposit.service";

export const updateBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await handleUpdateBooking(req);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(422).json({ error: err.message });
  }
};

export const cancelBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await handleCancelBooking(req);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(422).json({ error: err.message });
  }
};

export const getAllBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await handleGetAllBooking(req);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(422).json({ error: err.message });
  }
};

export const getUserBookingStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await handleUserBookingStats(req);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(422).json({ error: err.message });
  }
};

export const getUserYearlyStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await handleUserMonthlyRevenue(req);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(422).json({ error: err.message });
  }
};

// ========================
// Create Booking
// ========================
export const createBooking = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { vehicleId, pickupDate, dropoffDate, paymentMethodId } = req.body;
    const userId = req.user?.id;

    // Validation
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!vehicleId || !pickupDate || !dropoffDate || !paymentMethodId) {
      res.status(400).json({
        error: "vehicleId, pickupDate, dropoffDate, and paymentMethodId are required",
      });
      return;
    }

    // Parse dates
    const pickup = new Date(pickupDate);
    const dropoff = new Date(dropoffDate);
    const now = new Date();

    // Date validations
    if (isNaN(pickup.getTime()) || isNaN(dropoff.getTime())) {
      res.status(400).json({ error: "Invalid date format" });
      return;
    }

    if (pickup >= dropoff) {
      res.status(400).json({
        error: "Pickup date must be before dropoff date",
      });
      return;
    }

    if (pickup < now) {
      res.status(400).json({
        error: "Pickup date cannot be in the past",
      });
      return;
    }

    // Find vehicle
    const vehicle = await Vehicle.findById(vehicleId).populate("host");
    if (!vehicle) {
      res.status(404).json({ error: "Vehicle not found" });
      return;
    }

    if (vehicle.status !== "active") {
      res.status(400).json({ error: "Vehicle is not available" });
      return;
    }

    const hostId = vehicle.host;

    // Check for overlapping bookings
    const overlappingBooking = await Booking.findOne({
      vehicle: vehicleId,
      bookingStatus: { $nin: ["completed", "canceled"] },
      $or: [
        // Case 1: New booking starts during existing booking
        {
          pickupDate: { $lte: pickup },
          dropoffDate: { $gt: pickup },
        },
        // Case 2: New booking ends during existing booking
        {
          pickupDate: { $lt: dropoff },
          dropoffDate: { $gte: dropoff },
        },
        // Case 3: New booking completely contains existing booking
        {
          pickupDate: { $gte: pickup },
          dropoffDate: { $lte: dropoff },
        },
      ],
    });

    if (overlappingBooking) {
      res.status(409).json({
        error: "Vehicle is already booked for the selected dates",
        existingBooking: {
          pickupDate: overlappingBooking.pickupDate,
          dropoffDate: overlappingBooking.dropoffDate,
        },
      });
      return;
    }

    // Calculate total days and amount
    const totalDays = Math.ceil(
      (dropoff.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24)
    );
    const baseAmount = totalDays * vehicle.rent;

    // Calculate security deposit based on vehicle value
    const securityDeposit = calculateSecurityDeposit(vehicle);

    // Calculate fees
    const platformFeePercentage = 15;
    const platformFee = (baseAmount * platformFeePercentage) / 100;
    const insuranceFee = baseAmount * 0.05; // 5% insurance
    const transactionFee = baseAmount * 0.029 + 0.30; // Stripe fee (~2.9% + $0.30)

    const totalAmount = baseAmount + platformFee + insuranceFee + transactionFee;

    // Create payment intent
    let paymentIntent;
    try {
      const amountInCents = Math.round(totalAmount * 100);
      paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "usd",
        payment_method: paymentMethodId,
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: "never",
        },
        metadata: {
          userId: userId.toString(),
          vehicleId: vehicleId,
          totalAmount: totalAmount.toString(),
          totalDays: totalDays.toString(),
        },
      });

      if (paymentIntent.status !== "succeeded") {
        res.status(400).json({
          error: "Payment failed",
          status: paymentIntent.status,
        });
        return;
      }
    } catch (paymentError: any) {
      res.status(400).json({
        error: "Payment failed",
        details: paymentError.message,
      });
      return;
    }

    // Store booking in DB
    let booking;
    try {
      booking = await Booking.create({
        user: userId,
        host: hostId,
        vehicle: vehicleId,
        paymentIntentId: paymentIntent.id,
        paymentStatus: "succeeded",
        bookingStatus: "in-progress",
        totalAmount,
        totalDays,
        pickupDate: pickup,
        dropoffDate: dropoff,
        securityDeposit,
        securityDepositStatus: "held",
        platformFee,
        insuranceFee,
        transactionFee,
      });

      res.status(201).json({
        success: true,
        message: "Booking created successfully",
        booking: {
          id: booking._id,
          vehicleId: booking.vehicle,
          paymentIntentId: booking.paymentIntentId,
          totalAmount: booking.totalAmount,
          totalDays: booking.totalDays,
          pickupDate: booking.pickupDate,
          dropoffDate: booking.dropoffDate,
          bookingStatus: booking.bookingStatus,
          paymentStatus: booking.paymentStatus,
        },
      });
    } catch (dbError: any) {
      // If DB save fails, refund the payment
      console.error("Database error, initiating refund:", dbError.message);
      try {
        await refundPayment(paymentIntent.id);
        res.status(500).json({
          error: "Booking creation failed, payment has been refunded",
          details: dbError.message,
        });
      } catch (refundError: any) {
        console.error("Refund failed:", refundError.message);
        res.status(500).json({
          error: "Booking creation failed and refund failed",
          details: {
            dbError: dbError.message,
            refundError: refundError.message,
          },
          paymentIntentId: paymentIntent.id,
        });
      }
      return;
    }
  } catch (err: any) {
    console.error("Create booking error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ========================
// Confirm Booking
// ========================
export const confirmBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { bookingId } = req.body;

    // Validation
    if (!bookingId) {
      res.status(400).json({ error: "Booking ID is required" });
      return;
    }

    // Find booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    // Check if booking is in in-progress status
    if (booking.bookingStatus !== "in-progress") {
      res.status(400).json({
        error: `Cannot confirm booking with status: ${booking.bookingStatus}`,
        currentStatus: booking.bookingStatus,
      });
      return;
    }

    // Update booking status to completed
    booking.bookingStatus = "completed";
    await booking.save();

    res.status(200).json({
      success: true,
      message: "Booking confirmed successfully",
      booking: {
        id: booking._id,
        bookingStatus: booking.bookingStatus,
        paymentStatus: booking.paymentStatus,
        totalAmount: booking.totalAmount,
      },
    });
  } catch (err: any) {
    console.error("Confirm booking error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
