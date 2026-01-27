import express from "express";
import {
    getCustomers,
    getCustomerCount,
    getCustomerProfile,
    updateCustomerStatus,
    getHosts,
    getPendingHosts,
    getHostCount,
    getHostProfile,
    approveHost,
    rejectHost,
    updateHostStatus,
    getVehicles,
    getPendingVehicles,
    getVehicleCount,
    approveVehicle,
    rejectVehicle,
    getBookings,
    getBookingStats,
    getPlatformStats,
} from "./admin.controller";
import {
    adminLogin,
    requestPasswordReset,
    resetPassword,
} from "./admin.auth.controller";
import { userAuth } from "../../middlewares";

const router = express.Router();

// ========================
// Admin Authentication Routes (No auth required)
// ========================
router.post("/auth/login", adminLogin);
router.post("/auth/forgot-password", requestPasswordReset);
router.post("/auth/reset-password", resetPassword);

// Middleware to check if user is admin
const adminAuth = (req: any, res: any, next: any) => {
    userAuth(req, res, () => {
        if (req.user?.role !== "admin") {
            return res.status(403).json({ error: "Admin access required" });
        }
        next();
    });
};

// ========================
// Customer User Management Routes
// ========================
router.get("/customers", adminAuth, getCustomers);
router.get("/customers/count", adminAuth, getCustomerCount);
router.get("/customers/:customerId", adminAuth, getCustomerProfile);
router.patch("/customers/:customerId/status", adminAuth, updateCustomerStatus);

// ========================
// Host User Management Routes
// ========================
router.get("/hosts", adminAuth, getHosts);
router.get("/hosts/pending", adminAuth, getPendingHosts);
router.get("/hosts/count", adminAuth, getHostCount);
router.get("/hosts/:hostId", adminAuth, getHostProfile);
router.post("/hosts/:hostId/approve", adminAuth, approveHost);
router.post("/hosts/:hostId/reject", adminAuth, rejectHost);
router.patch("/hosts/:hostId/status", adminAuth, updateHostStatus);

// ========================
// Vehicle Management Routes
// ========================
router.get("/vehicles", adminAuth, getVehicles);
router.get("/vehicles/pending", adminAuth, getPendingVehicles);
router.get("/vehicles/count", adminAuth, getVehicleCount);
router.post("/vehicles/:vehicleId/approve", adminAuth, approveVehicle);
router.post("/vehicles/:vehicleId/reject", adminAuth, rejectVehicle);

// ========================
// Booking & Payment Management Routes
// ========================
router.get("/bookings", adminAuth, getBookings);
router.get("/bookings/stats", adminAuth, getBookingStats);

// ========================
// Platform Statistics Routes
// ========================
router.get("/stats", adminAuth, getPlatformStats);

export default router;
