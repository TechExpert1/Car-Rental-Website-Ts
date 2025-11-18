// import { Response } from "express";
// import AuthRequest from "../../middlewares/userAuth";
// import {
//   processCancellation,
//   processEarlyReturn,
//   markNoShow,
// } from "../../services/cancellation.service";
// import {
//   getAllDisputes,
//   getDisputeById,
//   resolveDispute,
//   rejectDispute,
// } from "../../services/dispute.service";
// import {
//   processHostPayout,
//   getPendingPayouts,
//   batchProcessPayouts,
//   getHostPayoutHistory,
// } from "../../services/hostPayout.service";
// import User from "../auth/auth.model";
// import Booking from "../booking/booking.model";
// import Vehicle from "../vehicle/vehicle.model";

// // ========================
// // Cancellation Management
// // ========================

// /**
//  * Admin cancel a booking
//  */
// export const adminCancelBooking = async (
//   req: AuthRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { bookingId, reason } = req.body;

//     if (!bookingId) {
//       res.status(400).json({ error: "Booking ID is required" });
//       return;
//     }

//     const result = await processCancellation(bookingId, "admin", reason);

//     res.status(200).json(result);
//   } catch (error: any) {
//     console.error("Admin cancel booking error:", error.message);
//     res.status(400).json({ error: error.message });
//   }
// };

// /**
//  * Process early return
//  */
// export const adminProcessEarlyReturn = async (
//   req: AuthRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { bookingId, hostApproved } = req.body;

//     if (!bookingId || hostApproved === undefined) {
//       res
//         .status(400)
//         .json({ error: "Booking ID and hostApproved flag are required" });
//       return;
//     }

//     const result = await processEarlyReturn(bookingId, hostApproved);

//     res.status(200).json(result);
//   } catch (error: any) {
//     console.error("Admin process early return error:", error.message);
//     res.status(400).json({ error: error.message });
//   }
// };

// /**
//  * Mark booking as no-show
//  */
// export const adminMarkNoShow = async (
//   req: AuthRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { bookingId } = req.body;

//     if (!bookingId) {
//       res.status(400).json({ error: "Booking ID is required" });
//       return;
//     }

//     const result = await markNoShow(bookingId);

//     res.status(200).json(result);
//   } catch (error: any) {
//     console.error("Admin mark no-show error:", error.message);
//     res.status(400).json({ error: error.message });
//   }
// };

// // ========================
// // Dispute Management
// // ========================

// /**
//  * Get all disputes
//  */
// export const adminGetAllDisputes = async (
//   req: AuthRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { status, limit } = req.query;

//     const disputes = await getAllDisputes(
//       status as string,
//       limit ? parseInt(limit as string) : 50
//     );

//     res.status(200).json({ success: true, disputes });
//   } catch (error: any) {
//     console.error("Admin get disputes error:", error.message);
//     res.status(400).json({ error: error.message });
//   }
// };

// /**
//  * Get dispute by ID
//  */
// export const adminGetDisputeById = async (
//   req: AuthRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { disputeId } = req.params;

//     const dispute = await getDisputeById(disputeId);

//     res.status(200).json({ success: true, dispute });
//   } catch (error: any) {
//     console.error("Admin get dispute error:", error.message);
//     res.status(400).json({ error: error.message });
//   }
// };

// /**
//  * Resolve dispute
//  */
// export const adminResolveDispute = async (
//   req: AuthRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { disputeId } = req.params;
//     const { action, securityDepositDeduction, notes } = req.body;
//     const adminId = req.user?.id;

//     if (!adminId) {
//       res.status(401).json({ error: "Unauthorized" });
//       return;
//     }

//     if (action === undefined || securityDepositDeduction === undefined) {
//       res.status(400).json({
//         error: "Action and securityDepositDeduction are required",
//       });
//       return;
//     }

//     const result = await resolveDispute(
//       disputeId,
//       adminId,
//       action,
//       securityDepositDeduction,
//       notes || ""
//     );

//     res.status(200).json(result);
//   } catch (error: any) {
//     console.error("Admin resolve dispute error:", error.message);
//     res.status(400).json({ error: error.message });
//   }
// };

// /**
//  * Reject dispute
//  */
// export const adminRejectDispute = async (
//   req: AuthRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { disputeId } = req.params;
//     const { notes } = req.body;
//     const adminId = req.user?.id;

//     if (!adminId) {
//       res.status(401).json({ error: "Unauthorized" });
//       return;
//     }

//     const result = await rejectDispute(disputeId, adminId, notes || "");

//     res.status(200).json(result);
//   } catch (error: any) {
//     console.error("Admin reject dispute error:", error.message);
//     res.status(400).json({ error: error.message });
//   }
// };

// // ========================
// // Host Payout Management
// // ========================

// /**
//  * Get pending payouts
//  */
// export const adminGetPendingPayouts = async (
//   req: AuthRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     const payouts = await getPendingPayouts();

//     res.status(200).json({ success: true, payouts });
//   } catch (error: any) {
//     console.error("Admin get pending payouts error:", error.message);
//     res.status(400).json({ error: error.message });
//   }
// };

// /**
//  * Process single host payout
//  */
// export const adminProcessHostPayout = async (
//   req: AuthRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { bookingId } = req.body;

//     if (!bookingId) {
//       res.status(400).json({ error: "Booking ID is required" });
//       return;
//     }

//     const result = await processHostPayout(bookingId);

//     res.status(200).json(result);
//   } catch (error: any) {
//     console.error("Admin process host payout error:", error.message);
//     res.status(400).json({ error: error.message });
//   }
// };

// /**
//  * Batch process all eligible payouts
//  */
// export const adminBatchProcessPayouts = async (
//   req: AuthRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     const result = await batchProcessPayouts();

//     res.status(200).json(result);
//   } catch (error: any) {
//     console.error("Admin batch process payouts error:", error.message);
//     res.status(400).json({ error: error.message });
//   }
// };

// /**
//  * Get host payout history
//  */
// export const adminGetHostPayoutHistory = async (
//   req: AuthRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { hostId } = req.params;
//     const { limit } = req.query;

//     const payouts = await getHostPayoutHistory(
//       hostId,
//       limit ? parseInt(limit as string) : 50
//     );

//     res.status(200).json({ success: true, payouts });
//   } catch (error: any) {
//     console.error("Admin get host payout history error:", error.message);
//     res.status(400).json({ error: error.message });
//   }
// };

// // ========================
// // Host Verification
// // ========================

// /**
//  * Verify host (manual verification by admin)
//  */
// export const adminVerifyHost = async (
//   req: AuthRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { hostId } = req.body;

//     if (!hostId) {
//       res.status(400).json({ error: "Host ID is required" });
//       return;
//     }

//     const host = await User.findById(hostId);

//     if (!host) {
//       res.status(404).json({ error: "Host not found" });
//       return;
//     }

//     if (host.role !== "host") {
//       res.status(400).json({ error: "User is not a host" });
//       return;
//     }

//     host.isVerifiedHost = true;
//     await host.save();

//     res.status(200).json({
//       success: true,
//       message: "Host verified successfully",
//       host: {
//         id: host._id,
//         email: host.email,
//         isVerifiedHost: host.isVerifiedHost,
//       },
//     });
//   } catch (error: any) {
//     console.error("Admin verify host error:", error.message);
//     res.status(400).json({ error: error.message });
//   }
// };

// /**
//  * Unverify host
//  */
// export const adminUnverifyHost = async (
//   req: AuthRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { hostId } = req.body;

//     if (!hostId) {
//       res.status(400).json({ error: "Host ID is required" });
//       return;
//     }

//     const host = await User.findById(hostId);

//     if (!host) {
//       res.status(404).json({ error: "Host not found" });
//       return;
//     }

//     host.isVerifiedHost = false;
//     await host.save();

//     res.status(200).json({
//       success: true,
//       message: "Host verification removed",
//       host: {
//         id: host._id,
//         email: host.email,
//         isVerifiedHost: host.isVerifiedHost,
//       },
//     });
//   } catch (error: any) {
//     console.error("Admin unverify host error:", error.message);
//     res.status(400).json({ error: error.message });
//   }
// };

// /**
//  * Feature/Boost host listing
//  */
// export const adminFeatureHost = async (
//   req: AuthRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { hostId, featured } = req.body;

//     if (!hostId || featured === undefined) {
//       res.status(400).json({ error: "Host ID and featured flag are required" });
//       return;
//     }

//     const host = await User.findById(hostId);

//     if (!host) {
//       res.status(404).json({ error: "Host not found" });
//       return;
//     }

//     if (host.role !== "host") {
//       res.status(400).json({ error: "User is not a host" });
//       return;
//     }

//     host.isFeaturedHost = featured;
//     await host.save();

//     res.status(200).json({
//       success: true,
//       message: featured ? "Host featured successfully" : "Host unfeatured",
//       host: {
//         id: host._id,
//         email: host.email,
//         isFeaturedHost: host.isFeaturedHost,
//       },
//     });
//   } catch (error: any) {
//     console.error("Admin feature host error:", error.message);
//     res.status(400).json({ error: error.message });
//   }
// };

// // ========================
// // Statistics & Reports
// // ========================

// /**
//  * Get platform statistics
//  */
// export const adminGetStatistics = async (
//   req: AuthRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     const totalUsers = await User.countDocuments();
//     const totalHosts = await User.countDocuments({ role: "host" });
//     const totalGuests = await User.countDocuments({ role: "customer" });
//     const verifiedHosts = await User.countDocuments({ isVerifiedHost: true });

//     const totalVehicles = await Vehicle.countDocuments();
//     const activeVehicles = await Vehicle.countDocuments({ status: "active" });

//     const totalBookings = await Booking.countDocuments();
//     const completedBookings = await Booking.countDocuments({
//       bookingStatus: "completed",
//     });
//     const canceledBookings = await Booking.countDocuments({
//       bookingStatus: "canceled",
//     });
//     const activeBookings = await Booking.countDocuments({
//       bookingStatus: { $in: ["in-progress", "active"] },
//     });

//     const totalRevenue = await Booking.aggregate([
//       { $match: { bookingStatus: "completed" } },
//       { $group: { _id: null, total: { $sum: "$totalAmount" } } },
//     ]);

//     const platformRevenue = await Booking.aggregate([
//       { $match: { bookingStatus: "completed" } },
//       { $group: { _id: null, total: { $sum: "$platformFee" } } },
//     ]);

//     const Dispute = require("../dispute/dispute.model").default;
//     const openDisputes = await Dispute.countDocuments({ status: "open" });
//     const resolvedDisputes = await Dispute.countDocuments({
//       status: "resolved",
//     });

//     res.status(200).json({
//       success: true,
//       statistics: {
//         users: {
//           total: totalUsers,
//           hosts: totalHosts,
//           guests: totalGuests,
//           verifiedHosts,
//         },
//         vehicles: {
//           total: totalVehicles,
//           active: activeVehicles,
//         },
//         bookings: {
//           total: totalBookings,
//           completed: completedBookings,
//           canceled: canceledBookings,
//           active: activeBookings,
//         },
//         revenue: {
//           total: totalRevenue[0]?.total || 0,
//           platformRevenue: platformRevenue[0]?.total || 0,
//         },
//         disputes: {
//           open: openDisputes,
//           resolved: resolvedDisputes,
//         },
//       },
//     });
//   } catch (error: any) {
//     console.error("Admin get statistics error:", error.message);
//     res.status(400).json({ error: error.message });
//   }
// };

// /**
//  * Get all bookings with filters (admin view)
//  */
// export const adminGetAllBookings = async (
//   req: AuthRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { status, limit, page } = req.query;

//     const query: any = {};
//     if (status) {
//       query.bookingStatus = status;
//     }

//     const pageNum = parseInt(page as string) || 1;
//     const limitNum = parseInt(limit as string) || 50;
//     const skip = (pageNum - 1) * limitNum;

//     const bookings = await Booking.find(query)
//       .populate("user", "name email username")
//       .populate("host", "name email username isVerifiedHost")
//       .populate("vehicle", "name rent type")
//       .sort({ createdAt: -1 })
//       .limit(limitNum)
//       .skip(skip);

//     const total = await Booking.countDocuments(query);

//     res.status(200).json({
//       success: true,
//       bookings,
//       pagination: {
//         total,
//         page: pageNum,
//         limit: limitNum,
//         pages: Math.ceil(total / limitNum),
//       },
//     });
//   } catch (error: any) {
//     console.error("Admin get all bookings error:", error.message);
//     res.status(400).json({ error: error.message });
//   }
// };
