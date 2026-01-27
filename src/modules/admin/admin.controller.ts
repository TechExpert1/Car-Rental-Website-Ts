import { Response } from "express";
import AuthRequest from "../../middlewares/userAuth";
import * as adminService from "./admin.service";

// ========================
// Customer User Management
// ========================

/**
 * Get all customers
 */
export const getCustomers = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const { page, limit, search, accountStatus } = req.query;

        const result = await adminService.getAllCustomers(
            page ? parseInt(page as string) : 1,
            limit ? parseInt(limit as string) : 50,
            search as string,
            accountStatus as string
        );

        res.status(200).json({ success: true, ...result });
    } catch (error: any) {
        console.error("Get customers error:", error.message);
        res.status(400).json({ error: error.message });
    }
};

/**
 * Get customer count
 */
export const getCustomerCount = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const result = await adminService.getCustomerCount();
        res.status(200).json({ success: true, ...result });
    } catch (error: any) {
        console.error("Get customer count error:", error.message);
        res.status(400).json({ error: error.message });
    }
};

/**
 * Get customer profile
 */
export const getCustomerProfile = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const { customerId } = req.params;
        const result = await adminService.getCustomerProfile(customerId);
        res.status(200).json({ success: true, ...result });
    } catch (error: any) {
        console.error("Get customer profile error:", error.message);
        res.status(400).json({ error: error.message });
    }
};

/**
 * Update customer account status
 */
export const updateCustomerStatus = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const { customerId } = req.params;
        const { accountStatus } = req.body;

        if (!["active", "inactive", "banned"].includes(accountStatus)) {
            res.status(400).json({ error: "Invalid account status" });
            return;
        }

        const result = await adminService.updateCustomerStatus(
            customerId,
            accountStatus
        );
        res.status(200).json(result);
    } catch (error: any) {
        console.error("Update customer status error:", error.message);
        res.status(400).json({ error: error.message });
    }
};

// ========================
// Host User Management
// ========================

/**
 * Get all hosts
 */
export const getHosts = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const { page, limit, search, approvalStatus, accountStatus } = req.query;

        const result = await adminService.getAllHosts(
            page ? parseInt(page as string) : 1,
            limit ? parseInt(limit as string) : 50,
            search as string,
            approvalStatus as string,
            accountStatus as string
        );

        res.status(200).json({ success: true, ...result });
    } catch (error: any) {
        console.error("Get hosts error:", error.message);
        res.status(400).json({ error: error.message });
    }
};

/**
 * Get pending host approvals
 */
export const getPendingHosts = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const result = await adminService.getPendingHosts();
        res.status(200).json({ success: true, pendingHosts: result });
    } catch (error: any) {
        console.error("Get pending hosts error:", error.message);
        res.status(400).json({ error: error.message });
    }
};

/**
 * Get host count
 */
export const getHostCount = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const result = await adminService.getHostCount();
        res.status(200).json({ success: true, ...result });
    } catch (error: any) {
        console.error("Get host count error:", error.message);
        res.status(400).json({ error: error.message });
    }
};

/**
 * Get host profile
 */
export const getHostProfile = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const { hostId } = req.params;
        const result = await adminService.getHostProfile(hostId);
        res.status(200).json({ success: true, ...result });
    } catch (error: any) {
        console.error("Get host profile error:", error.message);
        res.status(400).json({ error: error.message });
    }
};

/**
 * Approve host account
 */
export const approveHost = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const { hostId } = req.params;
        const result = await adminService.approveHost(hostId);
        res.status(200).json(result);
    } catch (error: any) {
        console.error("Approve host error:", error.message);
        res.status(400).json({ error: error.message });
    }
};

/**
 * Reject host account
 */
export const rejectHost = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const { hostId } = req.params;
        const { reason } = req.body;

        if (!reason) {
            res.status(400).json({ error: "Rejection reason is required" });
            return;
        }

        const result = await adminService.rejectHost(hostId, reason);
        res.status(200).json(result);
    } catch (error: any) {
        console.error("Reject host error:", error.message);
        res.status(400).json({ error: error.message });
    }
};

/**
 * Update host account status
 */
export const updateHostStatus = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const { hostId } = req.params;
        const { accountStatus } = req.body;

        if (!["active", "inactive", "banned"].includes(accountStatus)) {
            res.status(400).json({ error: "Invalid account status" });
            return;
        }

        const result = await adminService.updateHostStatus(hostId, accountStatus);
        res.status(200).json(result);
    } catch (error: any) {
        console.error("Update host status error:", error.message);
        res.status(400).json({ error: error.message });
    }
};

// ========================
// Vehicle Management
// ========================

/**
 * Get all vehicles
 */
export const getVehicles = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const { page, limit, search, approvalStatus, status } = req.query;

        const result = await adminService.getAllVehicles(
            page ? parseInt(page as string) : 1,
            limit ? parseInt(limit as string) : 50,
            search as string,
            approvalStatus as string,
            status as string
        );

        res.status(200).json({ success: true, ...result });
    } catch (error: any) {
        console.error("Get vehicles error:", error.message);
        res.status(400).json({ error: error.message });
    }
};

/**
 * Get pending vehicle approvals
 */
export const getPendingVehicles = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const result = await adminService.getPendingVehicles();
        res.status(200).json({ success: true, pendingVehicles: result });
    } catch (error: any) {
        console.error("Get pending vehicles error:", error.message);
        res.status(400).json({ error: error.message });
    }
};

/**
 * Get vehicle count
 */
export const getVehicleCount = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const result = await adminService.getVehicleCount();
        res.status(200).json({ success: true, ...result });
    } catch (error: any) {
        console.error("Get vehicle count error:", error.message);
        res.status(400).json({ error: error.message });
    }
};

/**
 * Approve vehicle
 */
export const approveVehicle = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const { vehicleId } = req.params;
        const result = await adminService.approveVehicle(vehicleId);
        res.status(200).json(result);
    } catch (error: any) {
        console.error("Approve vehicle error:", error.message);
        res.status(400).json({ error: error.message });
    }
};

/**
 * Reject vehicle
 */
export const rejectVehicle = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const { vehicleId } = req.params;
        const { reason } = req.body;

        if (!reason) {
            res.status(400).json({ error: "Rejection reason is required" });
            return;
        }

        const result = await adminService.rejectVehicle(vehicleId, reason);
        res.status(200).json(result);
    } catch (error: any) {
        console.error("Reject vehicle error:", error.message);
        res.status(400).json({ error: error.message });
    }
};

// ========================
// Booking & Payment Management
// ========================

/**
 * Get all bookings
 */
export const getBookings = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const { page, limit, bookingStatus, paymentStatus } = req.query;

        const result = await adminService.getAllBookings(
            page ? parseInt(page as string) : 1,
            limit ? parseInt(limit as string) : 50,
            bookingStatus as string,
            paymentStatus as string
        );

        res.status(200).json({ success: true, ...result });
    } catch (error: any) {
        console.error("Get bookings error:", error.message);
        res.status(400).json({ error: error.message });
    }
};

/**
 * Get booking statistics
 */
export const getBookingStats = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const result = await adminService.getBookingStats();
        res.status(200).json({ success: true, ...result });
    } catch (error: any) {
        console.error("Get booking stats error:", error.message);
        res.status(400).json({ error: error.message });
    }
};

// ========================
// Platform Statistics
// ========================

/**
 * Get platform statistics
 */
export const getPlatformStats = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const result = await adminService.getPlatformStats();
        res.status(200).json({ success: true, stats: result });
    } catch (error: any) {
        console.error("Get platform stats error:", error.message);
        res.status(400).json({ error: error.message });
    }
};
