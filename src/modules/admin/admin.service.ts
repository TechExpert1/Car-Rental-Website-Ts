import User from "../auth/auth.model";
import Vehicle from "../vehicle/vehicle.model";
import Booking from "../booking/booking.model";
import mongoose from "mongoose";

// ========================
// Customer User Management
// ========================

/**
 * Get all customers with pagination and filters
 */
export const getAllCustomers = async (
    page: number = 1,
    limit: number = 50,
    search?: string,
    accountStatus?: string
) => {
    const query: any = { role: "customer" };

    if (search) {
        query.$or = [
            { email: { $regex: search, $options: "i" } },
            { username: { $regex: search, $options: "i" } },
            { name: { $regex: search, $options: "i" } },
        ];
    }

    if (accountStatus) {
        query.accountStatus = accountStatus;
    }

    const skip = (page - 1) * limit;

    const customers = await User.find(query)
        .select("-password -resetOTP -otpExpiry")
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

    const total = await User.countDocuments(query);

    return {
        customers,
        pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        },
    };
};

/**
 * Get customer count
 */
export const getCustomerCount = async () => {
    const total = await User.countDocuments({ role: "customer" });
    const active = await User.countDocuments({
        role: "customer",
        accountStatus: "active",
    });
    const inactive = await User.countDocuments({
        role: "customer",
        accountStatus: "inactive",
    });
    const banned = await User.countDocuments({
        role: "customer",
        accountStatus: "banned",
    });

    return { total, active, inactive, banned };
};

/**
 * Get customer profile with bookings
 */
export const getCustomerProfile = async (customerId: string) => {
    const customer = await User.findById(customerId).select(
        "-password -resetOTP -otpExpiry"
    );

    if (!customer || customer.role !== "customer") {
        throw new Error("Customer not found");
    }

    // Get customer's bookings with payment details
    const bookings = await Booking.find({ user: customerId })
        .populate("vehicle", "name type rent images")
        .populate("host", "name email username")
        .sort({ createdAt: -1 });

    return {
        customer,
        bookings,
        stats: {
            totalBookings: bookings.length,
            completedBookings: bookings.filter((b) => b.bookingStatus === "completed")
                .length,
            canceledBookings: bookings.filter((b) => b.bookingStatus === "canceled")
                .length,
            totalSpent: bookings
                .filter((b) => b.paymentStatus === "succeeded")
                .reduce((sum, b) => sum + b.totalAmount, 0),
        },
    };
};

/**
 * Update customer account status
 */
export const updateCustomerStatus = async (
    customerId: string,
    accountStatus: "active" | "inactive" | "banned"
) => {
    const customer = await User.findById(customerId);

    if (!customer || customer.role !== "customer") {
        throw new Error("Customer not found");
    }

    customer.accountStatus = accountStatus;
    await customer.save();

    return {
        success: true,
        message: `Customer account status updated to ${accountStatus}`,
        customer: {
            id: customer._id,
            email: customer.email,
            accountStatus: customer.accountStatus,
        },
    };
};

// ========================
// Host User Management
// ========================

/**
 * Get all hosts with pagination and filters
 */
export const getAllHosts = async (
    page: number = 1,
    limit: number = 50,
    search?: string,
    approvalStatus?: string,
    accountStatus?: string
) => {
    const query: any = { role: "host" };

    if (search) {
        query.$or = [
            { email: { $regex: search, $options: "i" } },
            { username: { $regex: search, $options: "i" } },
            { name: { $regex: search, $options: "i" } },
        ];
    }

    if (approvalStatus) {
        query.hostApprovalStatus = approvalStatus;
    }

    if (accountStatus) {
        query.accountStatus = accountStatus;
    }

    const skip = (page - 1) * limit;

    const hosts = await User.find(query)
        .select("-password -resetOTP -otpExpiry")
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

    const total = await User.countDocuments(query);

    return {
        hosts,
        pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        },
    };
};

/**
 * Get pending host approvals
 */
export const getPendingHosts = async () => {
    const pendingHosts = await User.find({
        role: "host",
        hostApprovalStatus: "pending",
    }).select("-password -resetOTP -otpExpiry");

    return pendingHosts;
};

/**
 * Get host count
 */
export const getHostCount = async () => {
    const total = await User.countDocuments({ role: "host" });
    const pending = await User.countDocuments({
        role: "host",
        hostApprovalStatus: "pending",
    });
    const approved = await User.countDocuments({
        role: "host",
        hostApprovalStatus: "approved",
    });
    const rejected = await User.countDocuments({
        role: "host",
        hostApprovalStatus: "rejected",
    });
    const active = await User.countDocuments({
        role: "host",
        accountStatus: "active",
    });
    const banned = await User.countDocuments({
        role: "host",
        accountStatus: "banned",
    });

    return { total, pending, approved, rejected, active, banned };
};

/**
 * Get host profile with vehicles and bookings
 */
export const getHostProfile = async (hostId: string) => {
    const host = await User.findById(hostId).select(
        "-password -resetOTP -otpExpiry"
    );

    if (!host || host.role !== "host") {
        throw new Error("Host not found");
    }

    // Get host's vehicles
    const vehicles = await Vehicle.find({ host: hostId });

    // Get bookings for host's vehicles
    const bookings = await Booking.find({ host: hostId })
        .populate("vehicle", "name type rent images")
        .populate("user", "name email username")
        .sort({ createdAt: -1 });

    return {
        host,
        vehicles,
        bookings,
        stats: {
            totalVehicles: vehicles.length,
            activeVehicles: vehicles.filter((v) => v.status === "active").length,
            totalBookings: bookings.length,
            completedBookings: bookings.filter((b) => b.bookingStatus === "completed")
                .length,
            canceledBookings: bookings.filter((b) => b.bookingStatus === "canceled")
                .length,
            totalEarnings: bookings
                .filter((b) => b.paymentStatus === "succeeded" && b.hostPayoutAmount)
                .reduce((sum, b) => sum + (b.hostPayoutAmount || 0), 0),
        },
    };
};

/**
 * Approve host account
 */
export const approveHost = async (hostId: string) => {
    const host = await User.findById(hostId);

    if (!host || host.role !== "host") {
        throw new Error("Host not found");
    }

    host.hostApprovalStatus = "approved";
    host.isVerifiedHost = true;
    host.hostRejectionReason = undefined;
    await host.save();

    return {
        success: true,
        message: "Host approved successfully",
        host: {
            id: host._id,
            email: host.email,
            hostApprovalStatus: host.hostApprovalStatus,
            isVerifiedHost: host.isVerifiedHost,
        },
    };
};

/**
 * Reject host account
 */
export const rejectHost = async (hostId: string, reason: string) => {
    const host = await User.findById(hostId);

    if (!host || host.role !== "host") {
        throw new Error("Host not found");
    }

    host.hostApprovalStatus = "rejected";
    host.isVerifiedHost = false;
    host.hostRejectionReason = reason;
    await host.save();

    return {
        success: true,
        message: "Host rejected",
        host: {
            id: host._id,
            email: host.email,
            hostApprovalStatus: host.hostApprovalStatus,
            hostRejectionReason: host.hostRejectionReason,
        },
    };
};

/**
 * Update host account status
 */
export const updateHostStatus = async (
    hostId: string,
    accountStatus: "active" | "inactive" | "banned"
) => {
    const host = await User.findById(hostId);

    if (!host || host.role !== "host") {
        throw new Error("Host not found");
    }

    host.accountStatus = accountStatus;
    await host.save();

    return {
        success: true,
        message: `Host account status updated to ${accountStatus}`,
        host: {
            id: host._id,
            email: host.email,
            accountStatus: host.accountStatus,
        },
    };
};

// ========================
// Vehicle Management
// ========================

/**
 * Get all vehicles with pagination and filters
 */
export const getAllVehicles = async (
    page: number = 1,
    limit: number = 50,
    search?: string,
    approvalStatus?: string,
    status?: string
) => {
    const query: any = {};

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: "i" } },
            { type: { $regex: search, $options: "i" } },
            { vehicleModel: { $regex: search, $options: "i" } },
        ];
    }

    if (approvalStatus) {
        query.approvalStatus = approvalStatus;
    }

    if (status) {
        query.status = status;
    }

    const skip = (page - 1) * limit;

    const vehicles = await Vehicle.find(query)
        .populate("host", "name email username")
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

    const total = await Vehicle.countDocuments(query);

    return {
        vehicles,
        pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        },
    };
};

/**
 * Get pending vehicle approvals
 */
export const getPendingVehicles = async () => {
    const pendingVehicles = await Vehicle.find({
        approvalStatus: "pending",
    }).populate("host", "name email username");

    return pendingVehicles;
};

/**
 * Get vehicle count
 */
export const getVehicleCount = async () => {
    const total = await Vehicle.countDocuments();
    const pending = await Vehicle.countDocuments({ approvalStatus: "pending" });
    const approved = await Vehicle.countDocuments({ approvalStatus: "approved" });
    const rejected = await Vehicle.countDocuments({ approvalStatus: "rejected" });
    const active = await Vehicle.countDocuments({ status: "active" });
    const deactivated = await Vehicle.countDocuments({ status: "de-activated" });

    return { total, pending, approved, rejected, active, deactivated };
};

/**
 * Approve vehicle
 */
export const approveVehicle = async (vehicleId: string) => {
    const vehicle = await Vehicle.findById(vehicleId);

    if (!vehicle) {
        throw new Error("Vehicle not found");
    }

    vehicle.approvalStatus = "approved";
    vehicle.rejectionReason = undefined;
    await vehicle.save();

    return {
        success: true,
        message: "Vehicle approved successfully",
        vehicle: {
            id: vehicle._id,
            name: vehicle.name,
            approvalStatus: vehicle.approvalStatus,
        },
    };
};

/**
 * Reject vehicle
 */
export const rejectVehicle = async (vehicleId: string, reason: string) => {
    const vehicle = await Vehicle.findById(vehicleId);

    if (!vehicle) {
        throw new Error("Vehicle not found");
    }

    vehicle.approvalStatus = "rejected";
    vehicle.rejectionReason = reason;
    await vehicle.save();

    return {
        success: true,
        message: "Vehicle rejected",
        vehicle: {
            id: vehicle._id,
            name: vehicle.name,
            approvalStatus: vehicle.approvalStatus,
            rejectionReason: vehicle.rejectionReason,
        },
    };
};

// ========================
// Booking & Payment Management
// ========================

/**
 * Get all bookings with filters
 */
export const getAllBookings = async (
    page: number = 1,
    limit: number = 50,
    bookingStatus?: string,
    paymentStatus?: string
) => {
    const query: any = {};

    if (bookingStatus) {
        query.bookingStatus = bookingStatus;
    }

    if (paymentStatus) {
        query.paymentStatus = paymentStatus;
    }

    const skip = (page - 1) * limit;

    const bookings = await Booking.find(query)
        .populate("user", "name email username")
        .populate("host", "name email username")
        .populate("vehicle", "name type rent")
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

    const total = await Booking.countDocuments(query);

    return {
        bookings,
        pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        },
    };
};

/**
 * Get booking statistics
 */
export const getBookingStats = async () => {
    const total = await Booking.countDocuments();
    const inProgress = await Booking.countDocuments({
        bookingStatus: "in-progress",
    });
    const active = await Booking.countDocuments({ bookingStatus: "active" });
    const completed = await Booking.countDocuments({
        bookingStatus: "completed",
    });
    const canceled = await Booking.countDocuments({ bookingStatus: "canceled" });

    const paymentSucceeded = await Booking.countDocuments({
        paymentStatus: "succeeded",
    });
    const paymentPending = await Booking.countDocuments({
        paymentStatus: "pending",
    });
    const paymentFailed = await Booking.countDocuments({
        paymentStatus: "failed",
    });

    // Calculate total revenue
    const revenueData = await Booking.aggregate([
        { $match: { paymentStatus: "succeeded" } },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: "$totalAmount" },
                platformFees: { $sum: "$platformFeeAmount" },
                hostPayouts: { $sum: "$hostPayoutAmount" },
            },
        },
    ]);

    const revenue = revenueData[0] || {
        totalRevenue: 0,
        platformFees: 0,
        hostPayouts: 0,
    };

    return {
        bookingStatus: {
            total,
            inProgress,
            active,
            completed,
            canceled,
        },
        paymentStatus: {
            succeeded: paymentSucceeded,
            pending: paymentPending,
            failed: paymentFailed,
        },
        revenue,
    };
};

/**
 * Get platform statistics
 */
export const getPlatformStats = async () => {
    const userStats = {
        totalUsers: await User.countDocuments(),
        customers: await User.countDocuments({ role: "customer" }),
        hosts: await User.countDocuments({ role: "host" }),
        admins: await User.countDocuments({ role: "admin" }),
        activeUsers: await User.countDocuments({ accountStatus: "active" }),
        bannedUsers: await User.countDocuments({ accountStatus: "banned" }),
    };

    const hostStats = await getHostCount();
    const vehicleStats = await getVehicleCount();
    const bookingStats = await getBookingStats();

    return {
        users: userStats,
        hosts: hostStats,
        vehicles: vehicleStats,
        bookings: bookingStats,
    };
};
