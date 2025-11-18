// import { stripe } from "../config/stripe";
// import Booking from "../modules/booking/booking.model";
// import User from "../modules/auth/auth.model";
// import { IBooking } from "../modules/booking/booking.model";

// interface CancellationResult {
//   refundAmount: number;
//   refundPercentage: number;
//   hostPayout: number;
//   platformFee: number;
//   message: string;
// }

// /**
//  * Calculate refund and payout based on cancellation time
//  * Rules:
//  * - Free cancellation within 24 hours of booking if trip starts after 48 hours → 100% refund
//  * - Cancel 48-24 hours before trip → 50% refund to guest, 50% payout to host
//  * - Cancel within 24 hours before trip → no refund, host gets 80-90%, platform keeps 10-20%
//  * - No-show within 2 hours → treated as same-day cancellation, no refund
//  */
// export const calculateCancellationRefund = (
//   booking: IBooking,
//   canceledBy: "user" | "host" | "admin"
// ): CancellationResult => {
//   const now = new Date();
//   const bookingCreatedAt = new Date(booking.createdAt);
//   const pickupDate = new Date(booking.pickupDate);

//   const hoursSinceBooking =
//     (now.getTime() - bookingCreatedAt.getTime()) / (1000 * 60 * 60);
//   const hoursUntilPickup =
//     (pickupDate.getTime() - now.getTime()) / (1000 * 60 * 60);

//   const baseAmount =
//     booking.totalAmount -
//     booking.insuranceFee -
//     booking.transactionFee -
//     booking.platformFee;

//   let refundPercentage = 0;
//   let hostPayoutPercentage = 0;
//   let platformFeePercentage = 0;
//   let message = "";

//   // Rule 1: Free cancellation within 24 hours of booking if trip starts after 48 hours
//   if (hoursSinceBooking <= 24 && hoursUntilPickup > 48) {
//     refundPercentage = 100;
//     hostPayoutPercentage = 0;
//     platformFeePercentage = 0;
//     message =
//       "Free cancellation within 24 hours of booking (trip starts after 48 hours)";
//   }
//   // Rule 2: Cancel 48-24 hours before trip
//   else if (hoursUntilPickup > 24 && hoursUntilPickup <= 48) {
//     refundPercentage = 50;
//     hostPayoutPercentage = 50;
//     platformFeePercentage = 0;
//     message = "Cancellation 48-24 hours before trip";
//   }
//   // Rule 3: Cancel within 24 hours before trip
//   else if (hoursUntilPickup <= 24 && hoursUntilPickup > 0) {
//     refundPercentage = 0;
//     hostPayoutPercentage = 85; // Host gets 85%
//     platformFeePercentage = 15; // Platform keeps 15%
//     message = "Cancellation within 24 hours before trip";
//   }
//   // Rule 4: No-show (past pickup time or within 2 hours)
//   else if (hoursUntilPickup <= 0 || hoursUntilPickup <= 2) {
//     refundPercentage = 0;
//     hostPayoutPercentage = 85;
//     platformFeePercentage = 15;
//     message = "No-show or very late cancellation";
//   }
//   // Default case: Standard cancellation before 48 hours
//   else {
//     refundPercentage = 100;
//     hostPayoutPercentage = 0;
//     platformFeePercentage = 0;
//     message = "Standard cancellation (more than 48 hours before trip)";
//   }

//   const refundAmount = (baseAmount * refundPercentage) / 100;
//   const hostPayout = (baseAmount * hostPayoutPercentage) / 100;
//   const platformFee = (baseAmount * platformFeePercentage) / 100;

//   return {
//     refundAmount,
//     refundPercentage,
//     hostPayout,
//     platformFee,
//     message,
//   };
// };

// /**
//  * Process booking cancellation with automatic refund
//  */
// export const processCancellation = async (
//   bookingId: string,
//   canceledBy: "user" | "host" | "admin",
//   reason?: string
// ): Promise<any> => {
//   const booking = await Booking.findById(bookingId);

//   if (!booking) {
//     throw new Error("Booking not found");
//   }

//   if (booking.bookingStatus === "canceled") {
//     throw new Error("Booking is already canceled");
//   }

//   if (booking.bookingStatus === "completed") {
//     throw new Error("Cannot cancel a completed booking");
//   }

//   // Calculate refund amounts
//   const cancellationResult = calculateCancellationRefund(booking, canceledBy);

//   // Process refund through Stripe if refund amount > 0
//   let refundId: string | undefined;
//   let refundStatus: "pending" | "processed" | "failed" = "pending";

//   if (cancellationResult.refundAmount > 0 && booking.paymentIntentId) {
//     try {
//       const refund = await stripe.refunds.create({
//         payment_intent: booking.paymentIntentId,
//         amount: Math.round(cancellationResult.refundAmount * 100), // Convert to cents
//         reason: "requested_by_customer",
//       });

//       refundId = refund.id;
//       refundStatus = refund.status === "succeeded" ? "processed" : "pending";
//     } catch (error: any) {
//       console.error("Refund processing failed:", error.message);
//       refundStatus = "failed";
//       throw new Error(`Refund processing failed: ${error.message}`);
//     }
//   } else {
//     refundStatus = "processed"; // No refund needed
//   }

//   // Update booking with cancellation details
//   booking.bookingStatus = "canceled";
//   booking.paymentStatus =
//     cancellationResult.refundAmount > 0 ? "refunded" : booking.paymentStatus;
//   booking.cancellationDetails = {
//     canceledAt: new Date(),
//     canceledBy,
//     reason: reason || cancellationResult.message,
//     refundAmount: cancellationResult.refundAmount,
//     refundPercentage: cancellationResult.refundPercentage,
//     hostPayout: cancellationResult.hostPayout,
//     platformFee: cancellationResult.platformFee,
//     refundStatus,
//     refundId,
//   };

//   await booking.save();

//   // Transfer payout to host if applicable
//   if (cancellationResult.hostPayout > 0) {
//     try {
//       const host = await User.findById(booking.host);
//       if (
//         host &&
//         host.connected_acc_id &&
//         host.connected_acc_id !== "none" &&
//         host.payouts_enabled
//       ) {
//         const transfer = await stripe.transfers.create({
//           amount: Math.round(cancellationResult.hostPayout * 100),
//           currency: "usd",
//           destination: host.connected_acc_id,
//           description: `Cancellation payout for booking ${bookingId}`,
//         });

//         booking.hostPayoutStatus = "released";
//         booking.hostPayoutAmount = cancellationResult.hostPayout;
//         booking.hostPayoutDate = new Date();
//         await booking.save();

//         // Update host's total revenue
//         host.total_revenue =
//           (host.total_revenue || 0) + cancellationResult.hostPayout;
//         await host.save();
//       }
//     } catch (error: any) {
//       console.error("Host payout transfer failed:", error.message);
//     }
//   }

//   // Update host cancellation count if canceled by host
//   if (canceledBy === "host") {
//     const host = await User.findById(booking.host);
//     if (host) {
//       host.totalCancellations = (host.totalCancellations || 0) + 1;
//       await host.save();
//     }
//   }

//   return {
//     success: true,
//     message: "Booking canceled successfully",
//     cancellationDetails: {
//       refundAmount: cancellationResult.refundAmount,
//       refundPercentage: cancellationResult.refundPercentage,
//       hostPayout: cancellationResult.hostPayout,
//       platformFee: cancellationResult.platformFee,
//       refundStatus,
//       message: cancellationResult.message,
//     },
//   };
// };

// /**
//  * Process early return request
//  */
// export const processEarlyReturn = async (
//   bookingId: string,
//   hostApproved: boolean
// ): Promise<any> => {
//   const booking = await Booking.findById(bookingId);

//   if (!booking) {
//     throw new Error("Booking not found");
//   }

//   if (booking.bookingStatus !== "active") {
//     throw new Error("Only active bookings can have early returns");
//   }

//   const now = new Date();
//   const dropoffDate = new Date(booking.dropoffDate);

//   if (now >= dropoffDate) {
//     throw new Error("Booking has already reached the dropoff date");
//   }

//   // Calculate refund (only if host approves)
//   let refundAmount = 0;
//   if (hostApproved) {
//     const totalHours =
//       (dropoffDate.getTime() - new Date(booking.pickupDate).getTime()) /
//       (1000 * 60 * 60);
//     const remainingHours = (dropoffDate.getTime() - now.getTime()) / (1000 * 60 * 60);
//     const usedPercentage = ((totalHours - remainingHours) / totalHours) * 100;

//     // Refund remaining percentage (excluding fees)
//     const baseAmount =
//       booking.totalAmount -
//       booking.insuranceFee -
//       booking.transactionFee -
//       booking.platformFee;
//     refundAmount = (baseAmount * (100 - usedPercentage)) / 100;

//     // Process refund
//     if (refundAmount > 0 && booking.paymentIntentId) {
//       try {
//         await stripe.refunds.create({
//           payment_intent: booking.paymentIntentId,
//           amount: Math.round(refundAmount * 100),
//           reason: "requested_by_customer",
//         });

//         booking.paymentStatus = "partial_refund";
//       } catch (error: any) {
//         console.error("Early return refund failed:", error.message);
//         throw new Error(`Refund processing failed: ${error.message}`);
//       }
//     }
//   }

//   booking.earlyReturn = {
//     returnedAt: now,
//     hostApproved,
//     refundAmount,
//   };

//   await booking.save();

//   return {
//     success: true,
//     message: hostApproved
//       ? "Early return approved with refund"
//       : "Early return recorded, no refund issued",
//     refundAmount,
//   };
// };

// /**
//  * Mark booking as no-show
//  */
// export const markNoShow = async (bookingId: string): Promise<any> => {
//   const booking = await Booking.findById(bookingId);

//   if (!booking) {
//     throw new Error("Booking not found");
//   }

//   const now = new Date();
//   const pickupDate = new Date(booking.pickupDate);
//   const hoursAfterPickup = (now.getTime() - pickupDate.getTime()) / (1000 * 60 * 60);

//   if (hoursAfterPickup < 2) {
//     throw new Error("Can only mark as no-show 2 hours after pickup time");
//   }

//   booking.bookingStatus = "no-show";
//   await booking.save();

//   // Process as same-day cancellation (no refund, host gets payout)
//   return await processCancellation(bookingId, "admin", "No-show");
// };
