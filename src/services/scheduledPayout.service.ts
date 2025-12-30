import Booking from "../modules/booking/booking.model";
import User from "../modules/auth/auth.model";
import { stripe } from "../config/stripe";
import { PAYOUT_DELAY_DAYS, PLATFORM_FEE_PERCENTAGE } from "../config/payout.config";
import { createNotification } from "../modules/notifications/notification.service";

/**
 * Calculate the scheduled payout date based on booking confirmation
 * @param confirmationDate - The date when booking was confirmed
 * @returns Date when payout should be processed
 */
export const calculatePayoutDate = (confirmationDate: Date): Date => {
  const payoutDate = new Date(confirmationDate);
  payoutDate.setDate(payoutDate.getDate() + PAYOUT_DELAY_DAYS);
  return payoutDate;
};

/**
 * Calculate host payout amount
 * Deducts platform fee from total amount
 */
export const calculateHostPayoutAmount = (totalAmount: number): { hostPayout: number; platformFee: number } => {
  const platformFee = (totalAmount * PLATFORM_FEE_PERCENTAGE) / 100;
  const hostPayout = totalAmount - platformFee;

  return {
    hostPayout,
    platformFee,
  };
};

/**
 * Process a single scheduled payout
 * Transfers payment to host and updates their total_revenue
 */
export const processScheduledPayout = async (bookingId: string): Promise<any> => {
  try {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    // Check if booking is completed
    if (booking.bookingStatus !== "completed") {
      throw new Error(`Booking ${bookingId} is not completed. Status: ${booking.bookingStatus}`);
    }

    // Check if payout is already processed
    if (booking.payoutStatus === "completed") {
      console.log(`Payout for booking ${bookingId} already completed`);
      return { success: false, message: "Payout already completed" };
    }

    // Check if payout is already being processed
    if (booking.payoutStatus === "processing") {
      console.log(`Payout for booking ${bookingId} is already being processed`);
      return { success: false, message: "Payout already in progress" };
    }

    // Mark as processing to prevent duplicate processing
    booking.payoutStatus = "processing";
    await booking.save();

    // Get host information
    const hostId = typeof booking.host === 'object' && (booking.host as any)._id
      ? (booking.host as any)._id
      : booking.host;

    const host = await User.findById(hostId);

    if (!host) {
      booking.payoutStatus = "failed";
      await booking.save();
      throw new Error(`Host ${hostId} not found`);
    }

    // Check if host has valid Stripe account
    if (!host.connected_acc_id || host.connected_acc_id === "none" || !host.payouts_enabled) {
      booking.payoutStatus = "failed";
      await booking.save();
      throw new Error(`Host ${host.email} does not have a valid Stripe account for payouts`);
    }

    // Calculate payout amount
    const { hostPayout, platformFee } = calculateHostPayoutAmount(booking.totalAmount);

    // Transfer payment to host
    const transfer = await stripe.transfers.create({
      amount: Math.round(hostPayout * 100), // Convert to cents
      currency: "usd",
      destination: host.connected_acc_id,
      description: `Payout for completed booking ${bookingId}`,
      metadata: {
        bookingId: bookingId.toString(),
        hostId: (host._id as any).toString(),
        totalAmount: booking.totalAmount.toString(),
        hostPayout: hostPayout.toString(),
        platformFee: platformFee.toString(),
      },
    });

    // Update booking with payout information
    booking.payoutStatus = "completed";
    booking.payoutProcessedAt = new Date();
    booking.payoutTransferId = transfer.id;
    booking.hostPayoutAmount = hostPayout;
    booking.platformFeeAmount = platformFee;
    await booking.save();

    // Update host's total revenue
    host.total_revenue = (host.total_revenue || 0) + hostPayout;
    host.totalCompletedTrips = (host.totalCompletedTrips || 0) + 1;
    await host.save();

    console.log(`✅ Payout processed successfully for booking ${bookingId}. Amount: $${hostPayout}`);

    // Send payout notification to host
    try {
      await createNotification(
        (host._id as any).toString(),
        'payout_received',
        'Payout Received',
        `You have received a payout of $${hostPayout.toFixed(2)} for your completed booking. The funds have been transferred to your connected Stripe account.`,
        {
          bookingId: bookingId.toString(),
          payoutAmount: hostPayout,
          transferId: transfer.id,
          processedAt: new Date(),
        }
      );
      console.log(`📧 Payout notification sent to host for booking ${bookingId}`);
    } catch (notifError) {
      console.error('Failed to send payout notification to host:', notifError);
      // Don't fail the payout if notification fails
    }

    return {
      success: true,
      message: "Payout processed successfully",
      payout: {
        transferId: transfer.id,
        amount: hostPayout,
        platformFee,
        hostId: host._id,
        bookingId,
        processedAt: new Date(),
      },
    };
  } catch (error: any) {
    console.error(`❌ Error processing payout for booking ${bookingId}:`, error.message);

    // Determine if this is a retryable error
    const errorMessage = error.message || '';
    const isRetryableError =
      errorMessage.includes('insufficient') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('temporarily') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('network') ||
      error.type === 'StripeConnectionError' ||
      error.type === 'StripeAPIError';

    // Update booking status based on error type
    try {
      const updateData: any = {
        payoutErrorMessage: errorMessage,
        payoutLastAttemptAt: new Date(),
      };

      if (isRetryableError) {
        // Retryable errors: reset to pending so cron will retry later
        updateData.payoutStatus = 'pending';
        console.log(`⏳ Payout for booking ${bookingId} will be retried later (retryable error)`);
      } else {
        // Permanent errors: mark as failed
        updateData.payoutStatus = 'failed';
        console.log(`🔴 Payout for booking ${bookingId} permanently failed`);
      }

      await Booking.findByIdAndUpdate(bookingId, updateData);
    } catch (updateError) {
      console.error(`Failed to update booking status:`, updateError);
    }

    throw error;
  }
};

/**
 * Process all pending payouts that are due
 * This function is called by the cron job
 */
export const processPendingPayouts = async (): Promise<void> => {
  try {
    const now = new Date();

    // Find all bookings that:
    // 1. Are completed
    // 2. Have payout status as pending
    // 3. Have scheduled payout date that has passed
    const pendingPayouts = await Booking.find({
      bookingStatus: "completed",
      payoutStatus: "pending",
      scheduledPayoutDate: { $lte: now },
    });

    if (pendingPayouts.length === 0) {
      console.log("No pending payouts to process");
      return;
    }

    console.log(`Found ${pendingPayouts.length} pending payout(s) to process`);

    // Process each payout
    for (const booking of pendingPayouts) {
      try {
        await processScheduledPayout(booking._id.toString());
      } catch (error: any) {
        console.error(`Failed to process payout for booking ${booking._id}:`, error.message);
        // Continue processing other payouts even if one fails
      }
    }

    console.log("Finished processing pending payouts");
  } catch (error: any) {
    console.error("Error in processPendingPayouts:", error.message);
  }
};

