import { Request, Response } from "express";
import {
  handleUpdateBooking,
  handleGetAllBooking,
  handleUserBookingStats,
  handleUserMonthlyRevenue,
} from "./booking.service";
import Vehicle from "../vehicle/vehicle.model";
import Booking from "./booking.model";
import User from "../auth/auth.model";
import { stripe } from "../../config/stripe";
import { refundPayment } from "../../utils/booking";
import AuthRequest from "../../middlewares/userAuth";
import { calculatePayoutDate } from "../../services/scheduledPayout.service";
//import { calculateSecurityDeposit } from "../../services/securityDeposit.service";

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

/**
 * Cancel Booking with comprehensive refund rules
 *
 * User Cancellation Rules:
 * - Free cancellation within 24 hours of booking if trip starts after 48 hours → 100% refund
 * - Cancel 24-48 hours before trip starts → 50% refund to guest, 50% payout to host
 * - Cancel within 24 hours before trip starts → no refund, host gets 90%, platform keeps 10%
 *
 * Host Cancellation Rules:
 * - If host cancels before 48 hours of start date → 10% penalty deducted from next payout
 */
export const cancelBooking = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { canceledBy, cancellationReason } = req.body; // canceledBy: "user" | "host" | "admin"
    const userId = req.user?.id;

    // Validation
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!canceledBy || !["user", "host", "admin"].includes(canceledBy)) {
      res.status(400).json({
        error: "canceledBy is required and must be 'user', 'host', or 'admin'"
      });
      return;
    }

    // Find booking
    const booking = await Booking.findById(id).populate("user host");
    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    // Check if already canceled
    if (booking.bookingStatus === "canceled") {
      res.status(400).json({ error: "Booking is already canceled" });
      return;
    }

    // Check if completed
    if (booking.bookingStatus === "completed") {
      res.status(400).json({ error: "Cannot cancel a completed booking" });
      return;
    }

    // Verify authorization
    const userIdStr = userId.toString();
    const bookingUserId = typeof booking.user === 'object' && (booking.user as any)._id
      ? (booking.user as any)._id.toString()
      : booking.user.toString();
    const bookingHostId = typeof booking.host === 'object' && (booking.host as any)._id
      ? (booking.host as any)._id.toString()
      : booking.host.toString();

    if (canceledBy === "user" && userIdStr !== bookingUserId) {
      res.status(403).json({ error: "You are not authorized to cancel this booking as user" });
      return;
    }

    if (canceledBy === "host" && userIdStr !== bookingHostId) {
      res.status(403).json({ error: "You are not authorized to cancel this booking as host" });
      return;
    }

    // Calculate time differences
    const now = new Date();
    const bookingCreatedAt = new Date(booking.createdAt);
    const pickupDate = new Date(booking.pickupDate);

    const hoursFromBooking = (now.getTime() - bookingCreatedAt.getTime()) / (1000 * 60 * 60);
    const hoursUntilPickup = (pickupDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    let refundAmount = 0;
    let refundPercentage = 0;
    let hostPayoutAmount = 0;
    let platformFeeAmount = 0;
    let message = "";

    // ========================
    // USER CANCELLATION LOGIC
    // ========================
    if (canceledBy === "user") {
      // Rule 1: Free cancellation within 24 hours of booking if trip starts after 48 hours
      if (hoursFromBooking <= 24 && hoursUntilPickup > 48) {
        refundAmount = booking.totalAmount;
        refundPercentage = 100;
        hostPayoutAmount = 0;
        platformFeeAmount = 0;
        message = "Free cancellation within 24 hours of booking. 100% refund issued.";
      }
      // Rule 2: Cancel 24-48 hours before trip starts
      else if (hoursUntilPickup >= 24 && hoursUntilPickup <= 48) {
        refundAmount = booking.totalAmount * 0.5;
        refundPercentage = 50;
        hostPayoutAmount = booking.totalAmount * 0.5;
        platformFeeAmount = 0;
        message = "Cancellation 24-48 hours before trip. 50% refund to guest, 50% payout to host.";
      }
      // Rule 3: Cancel within 24 hours before trip starts
      else if (hoursUntilPickup < 24) {
        refundAmount = 0;
        refundPercentage = 0;
        hostPayoutAmount = booking.totalAmount * 0.9;
        platformFeeAmount = booking.totalAmount * 0.1;
        message = "Cancellation within 24 hours of trip. No refund. Host receives 90%, platform keeps 10%.";
      }
      // Default case (shouldn't happen but for safety)
      else {
        refundAmount = 0;
        refundPercentage = 0;
        hostPayoutAmount = booking.totalAmount;
        platformFeeAmount = 0;
        message = "Cancellation processed. No refund applicable.";
      }
    }
    // ========================
    // HOST CANCELLATION LOGIC
    // ========================
    else if (canceledBy === "host") {
      // Full refund to user
      refundAmount = booking.totalAmount;
      refundPercentage = 100;
      hostPayoutAmount = 0;


        const penaltyAmount = booking.totalAmount * 0.1;
        platformFeeAmount = penaltyAmount;

        // Update host's pending penalty
        const hostId = typeof booking.host === 'object' && (booking.host as any)._id
          ? (booking.host as any)._id
          : booking.host;
        const host = await User.findById(hostId);
        if (host) {
          host.pendingPenaltyAmount = (host.pendingPenaltyAmount || 0) + penaltyAmount;
          host.totalCancellations = (host.totalCancellations || 0) + 1;
          await host.save();
        }

        message = `Host cancellation before 48 hours. Full refund to guest. 10% penalty ($${penaltyAmount.toFixed(2)}) will be deducted from host's next payout.`;
      
    }
    // ========================
    // ADMIN CANCELLATION LOGIC
    // ========================
    else if (canceledBy === "admin") {
      // Admin can decide, but default to full refund
      refundAmount = booking.totalAmount;
      refundPercentage = 100;
      hostPayoutAmount = 0;
      platformFeeAmount = 0;
      message = "Admin cancellation. Full refund to guest.";
    }

    // Process refund if applicable
    let refundStatus = "not_applicable";
    if (refundAmount > 0 && booking.paymentIntentId) {
      try {
        await refundPayment(booking.paymentIntentId, refundAmount);
        refundStatus = "processed";
      } catch (refundError: any) {
        console.error("Refund failed:", refundError.message);
        res.status(500).json({
          error: "Failed to process refund",
          details: refundError.message
        });
        return;
      }
    }

    // Process host payout if applicable
    if (hostPayoutAmount > 0) {
      try {
        const hostId = typeof booking.host === 'object' && (booking.host as any)._id
          ? (booking.host as any)._id
          : booking.host;
        const host = await User.findById(hostId);
        if (host && host.connected_acc_id && host.connected_acc_id !== "none" && host.payouts_enabled) {
          const transfer = await stripe.transfers.create({
            amount: Math.round(hostPayoutAmount * 100),
            currency: "usd",
            destination: host.connected_acc_id,
            description: `Cancellation payout for booking ${id}`,
            metadata: {
              bookingId: id,
              hostId: (host._id as any).toString(),
              canceledBy,
            },
          });

          // Update host's total revenue
          host.total_revenue = (host.total_revenue || 0) + hostPayoutAmount;
          await host.save();

          console.log("Host payout transfer successful:", transfer.id);
        } else {
          console.warn("Host payout skipped: No valid Stripe account or payouts not enabled");
        }
      } catch (payoutError: any) {
        console.error("Host payout failed:", payoutError.message);
        // Don't fail the entire cancellation if payout fails
      }
    }

    // Update booking
    booking.bookingStatus = "canceled";
    booking.paymentStatus = refundAmount > 0
      ? (refundAmount === booking.totalAmount ? "refunded" : "partially_refunded")
      : booking.paymentStatus;
    booking.canceledBy = canceledBy;
    booking.canceledAt = now;
    booking.cancellationReason = cancellationReason || "";
    booking.refundAmount = refundAmount;
    booking.refundPercentage = refundPercentage;
    booking.hostPayoutAmount = hostPayoutAmount;
    booking.platformFeeAmount = platformFeeAmount;
    booking.refundProcessedAt = refundAmount > 0 ? now : undefined;

    await booking.save();

    res.status(200).json({
      success: true,
      message: "Booking canceled successfully",
      cancellationDetails: {
        bookingId: booking._id,
        canceledBy,
        canceledAt: now,
        refundAmount,
        refundPercentage,
        hostPayoutAmount,
        platformFeeAmount,
        refundStatus,
        message,
      },
    });
  } catch (err: any) {
    console.error("Cancel booking error:", err.message);
    res.status(500).json({ error: err.message });
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
    //const securityDeposit = calculateSecurityDeposit(vehicle);

    // Calculate fees
    const platformFeePercentage = 10;
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
        //securityDeposit,
        //securityDepositStatus: "held",
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

    // Calculate scheduled payout date (5 days from now by default)
    const now = new Date();
    const scheduledPayoutDate = calculatePayoutDate(now);

    // Update booking status to completed and schedule payout
    booking.bookingStatus = "completed";
    booking.scheduledPayoutDate = scheduledPayoutDate;
    booking.payoutStatus = "pending";
    await booking.save();

    console.log(`✅ Booking ${bookingId} confirmed. Payout scheduled for ${scheduledPayoutDate.toISOString()}`);

    res.status(200).json({
      success: true,
      message: "Booking confirmed successfully. Host payout scheduled.",
      booking: {
        id: booking._id,
        bookingStatus: booking.bookingStatus,
        paymentStatus: booking.paymentStatus,
        totalAmount: booking.totalAmount,
        scheduledPayoutDate: scheduledPayoutDate,
        payoutStatus: booking.payoutStatus,
      },
    });
  } catch (err: any) {
    console.error("Confirm booking error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
