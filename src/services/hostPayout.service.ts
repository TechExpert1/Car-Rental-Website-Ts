// import { stripe } from "../config/stripe";
// import Booking from "../modules/booking/booking.model";
// import User from "../modules/auth/auth.model";

// /**
//  * Calculate host payout amount
//  * Deducts platform fee and insurance from total amount
//  */
// export const calculateHostPayout = (
//   totalAmount: number,
//   platformFeePercentage: number = 15
// ): { hostPayout: number; platformFee: number } => {
//   const platformFee = (totalAmount * platformFeePercentage) / 100;
//   const hostPayout = totalAmount - platformFee;

//   return {
//     hostPayout,
//     platformFee,
//   };
// };

// /**
//  * Process host payout after trip completion
//  * Released 24-48 hours after trip completion
//  * Verified hosts get faster payouts (24 hours)
//  */
// export const processHostPayout = async (bookingId: string): Promise<any> => {
//   const booking = await Booking.findById(bookingId).populate("host");

//   if (!booking) {
//     throw new Error("Booking not found");
//   }

//   if (booking.bookingStatus !== "completed") {
//     throw new Error("Can only payout for completed bookings");
//   }

//   if (booking.hostPayoutStatus === "released") {
//     throw new Error("Host payout has already been released");
//   }

//   // Check if trip completion time has passed
//   const now = new Date();
//   const tripCompletedAt = booking.tripCompletedAt || new Date(booking.dropoffDate);
//   const hoursSinceCompletion =
//     (now.getTime() - tripCompletedAt.getTime()) / (1000 * 60 * 60);

//   const host = booking.host as any;

//   // Verified hosts get faster payouts (24 hours)
//   const requiredHours = host.isVerifiedHost ? 24 : 48;

//   if (hoursSinceCompletion < requiredHours) {
//     throw new Error(
//       `Host payout can only be released ${requiredHours} hours after trip completion. ${Math.ceil(
//         requiredHours - hoursSinceCompletion
//       )} hours remaining.`
//     );
//   }

//   // Check for open disputes
//   const Dispute = require("../modules/dispute/dispute.model").default;
//   const openDisputes = await Dispute.findOne({
//     booking: bookingId,
//     status: { $in: ["open", "under_review"] },
//   });

//   if (openDisputes) {
//     throw new Error(
//       "Cannot process payout while there are open disputes for this booking"
//     );
//   }

//   // Calculate payout amount
//   const baseAmount =
//     booking.totalAmount -
//     booking.insuranceFee -
//     booking.transactionFee;
//   const { hostPayout, platformFee } = calculateHostPayout(baseAmount);

//   // Check if host has connected Stripe account
//   if (
//     !host.connected_acc_id ||
//     host.connected_acc_id === "none" ||
//     !host.payouts_enabled
//   ) {
//     throw new Error("Host does not have a valid Stripe account for payouts");
//   }

//   // Transfer payout to host
//   try {
//     const transfer = await stripe.transfers.create({
//       amount: Math.round(hostPayout * 100), // Convert to cents
//       currency: "usd",
//       destination: host.connected_acc_id,
//       description: `Payout for completed booking ${bookingId}`,
//       metadata: {
//         bookingId: bookingId.toString(),
//         hostId: host._id.toString(),
//         totalAmount: booking.totalAmount.toString(),
//       },
//     });

//     // Update booking
//     booking.hostPayoutStatus = "released";
//     booking.hostPayoutAmount = hostPayout;
//     booking.hostPayoutDate = now;
//     booking.platformFee = platformFee;
//     await booking.save();

//     // Update host's total revenue and completed trips
//     host.total_revenue = (host.total_revenue || 0) + hostPayout;
//     host.totalCompletedTrips = (host.totalCompletedTrips || 0) + 1;
//     await host.save();

//     return {
//       success: true,
//       message: "Host payout processed successfully",
//       payout: {
//         transferId: transfer.id,
//         amount: hostPayout,
//         platformFee,
//         hostId: host._id,
//         bookingId,
//         processedAt: now,
//       },
//     };
//   } catch (error: any) {
//     console.error("Host payout transfer failed:", error.message);
//     booking.hostPayoutStatus = "failed";
//     await booking.save();

//     throw new Error(`Payout transfer failed: ${error.message}`);
//   }
// };

// /**
//  * Get all pending payouts (admin view)
//  */
// export const getPendingPayouts = async (): Promise<any> => {
//   const now = new Date();
//   const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

//   const pendingPayouts = await Booking.find({
//     bookingStatus: "completed",
//     hostPayoutStatus: "pending",
//     $or: [
//       { tripCompletedAt: { $lte: fortyEightHoursAgo } },
//       {
//         tripCompletedAt: null,
//         dropoffDate: { $lte: fortyEightHoursAgo },
//       },
//     ],
//   })
//     .populate("host", "name email username isVerifiedHost")
//     .populate("user", "name email username")
//     .populate("vehicle", "name rent")
//     .sort({ dropoffDate: 1 });

//   return pendingPayouts;
// };

// /**
//  * Batch process all eligible payouts (automated job)
//  */
// export const batchProcessPayouts = async (): Promise<any> => {
//   const pendingPayouts = await getPendingPayouts();

//   const results = {
//     successful: [] as any[],
//     failed: [] as any[],
//   };

//   for (const booking of pendingPayouts) {
//     try {
//       const result = await processHostPayout(booking._id.toString());
//       results.successful.push({
//         bookingId: booking._id,
//         hostId: booking.host,
//         amount: result.payout.amount,
//       });
//     } catch (error: any) {
//       results.failed.push({
//         bookingId: booking._id,
//         hostId: booking.host,
//         error: error.message,
//       });
//     }
//   }

//   return {
//     success: true,
//     message: "Batch payout processing completed",
//     totalProcessed: pendingPayouts.length,
//     successful: results.successful.length,
//     failed: results.failed.length,
//     results,
//   };
// };

// /**
//  * Get payout history for a host
//  */
// export const getHostPayoutHistory = async (
//   hostId: string,
//   limit: number = 50
// ): Promise<any> => {
//   const payouts = await Booking.find({
//     host: hostId,
//     hostPayoutStatus: "released",
//   })
//     .populate("vehicle", "name")
//     .populate("user", "name email")
//     .sort({ hostPayoutDate: -1 })
//     .limit(limit)
//     .select(
//       "hostPayoutAmount hostPayoutDate totalAmount platformFee bookingStatus pickupDate dropoffDate"
//     );

//   return payouts;
// };
