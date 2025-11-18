// import express from "express";
// import {
//   adminCancelBooking,
//   adminProcessEarlyReturn,
//   adminMarkNoShow,
//   adminGetAllDisputes,
//   adminGetDisputeById,
//   adminResolveDispute,
//   adminRejectDispute,
//   adminGetPendingPayouts,
//   adminProcessHostPayout,
//   adminBatchProcessPayouts,
//   adminGetHostPayoutHistory,
//   adminVerifyHost,
//   adminUnverifyHost,
//   adminFeatureHost,
//   adminGetStatistics,
//   adminGetAllBookings,
// } from "./admin.controller";
// import { userAuth } from "../../middlewares";

// const router = express.Router();

// // Middleware to check if user is admin (you should implement this)
// const adminAuth = (req: any, res: any, next: any) => {
//   userAuth(req, res, () => {
//     if (req.user?.role !== "admin") {
//       return res.status(403).json({ error: "Admin access required" });
//     }
//     next();
//   });
// };

// // ========================
// // Cancellation Management Routes
// // ========================
// router.post("/bookings/cancel", adminAuth, adminCancelBooking);
// router.post("/bookings/early-return", adminAuth, adminProcessEarlyReturn);
// router.post("/bookings/mark-no-show", adminAuth, adminMarkNoShow);

// // ========================
// // Dispute Management Routes
// // ========================
// router.get("/disputes", adminAuth, adminGetAllDisputes);
// router.get("/disputes/:disputeId", adminAuth, adminGetDisputeById);
// router.post("/disputes/:disputeId/resolve", adminAuth, adminResolveDispute);
// router.post("/disputes/:disputeId/reject", adminAuth, adminRejectDispute);

// // ========================
// // Host Payout Routes
// // ========================
// router.get("/payouts/pending", adminAuth, adminGetPendingPayouts);
// router.post("/payouts/process", adminAuth, adminProcessHostPayout);
// router.post("/payouts/batch-process", adminAuth, adminBatchProcessPayouts);
// router.get("/payouts/history/:hostId", adminAuth, adminGetHostPayoutHistory);

// // ========================
// // Host Verification Routes
// // ========================
// router.post("/hosts/verify", adminAuth, adminVerifyHost);
// router.post("/hosts/unverify", adminAuth, adminUnverifyHost);
// router.post("/hosts/feature", adminAuth, adminFeatureHost);

// // ========================
// // Statistics & Reports Routes
// // ========================
// router.get("/statistics", adminAuth, adminGetStatistics);
// router.get("/bookings", adminAuth, adminGetAllBookings);

// export default router;
