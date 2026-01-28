import User from "../auth/auth.model";
import Vehicle from "../vehicle/vehicle.model";
import Booking from "../booking/booking.model";
import mongoose from "mongoose";
import { transporter } from "../../config/nodemailer";

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

    // Send approval email notification
    try {
        if (host.email) {
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; background:#f9f9f9; padding:20px;">
                    <div style="max-width:600px; margin:auto; background:#fff; padding:30px; border-radius:12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align:center; margin-bottom:20px;">
                            <h1 style="color:#28a745; margin:0;">🎉 Host Application Approved!</h1>
                        </div>
                        <p style="font-size:16px; color:#333;">Hi ${host.name || host.username || 'there'},</p>
                        <p style="font-size:16px; color:#333;">Congratulations! Your host application has been approved. You can now start listing your vehicles and earning money as a verified host on our platform.</p>

                        <div style="background:#e8f5e9; padding:20px; border-radius:8px; margin:20px 0;">
                            <h3 style="color:#2e7d32; margin-top:0;">✅ What's Next?</h3>
                            <ul style="color:#333; font-size:14px;">
                                <li>Log in to your account</li>
                                <li>Add your vehicle listings</li>
                                <li>Set up your payout method</li>
                                <li>Start earning from rentals</li>
                            </ul>
                        </div>

                        <p style="font-size:14px; color:#666;">Welcome to our host community! If you have any questions, feel free to contact our support team.</p>

                        <div style="text-align:center; margin-top:30px;">
                            <p style="font-size:12px; color:#999;">Thank you for choosing us!</p>
                        </div>
                    </div>
                </div>
            `;

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: host.email,
                subject: "🎉 Congratulations! Your Host Application Has Been Approved",
                html: emailHtml,
            });
            console.log(`📨 Host approval email sent to ${host.email}`);
        }
    } catch (emailError) {
        console.error('Failed to send host approval email:', emailError);
        // Don't fail the approval if email fails
    }

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

    // Send rejection email notification
    try {
        if (host.email) {
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; background:#f9f9f9; padding:20px;">
                    <div style="max-width:600px; margin:auto; background:#fff; padding:30px; border-radius:12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align:center; margin-bottom:20px;">
                            <h1 style="color:#dc3545; margin:0;">⚠️ Host Application Update</h1>
                        </div>
                        <p style="font-size:16px; color:#333;">Hi ${host.name || host.username || 'there'},</p>
                        <p style="font-size:16px; color:#333;">We regret to inform you that your host application has been reviewed and requires some additional information or corrections.</p>

                        <div style="background:#fff3cd; padding:20px; border-radius:8px; margin:20px 0; border-left: 4px solid #ffc107;">
                            <h3 style="color:#856404; margin-top:0;">📝 Reason for Review</h3>
                            <p style="color:#333; font-size:14px; margin:0;">${reason}</p>
                        </div>

                        <div style="background:#f8f9fa; padding:20px; border-radius:8px; margin:20px 0;">
                            <h3 style="color:#2976BA; margin-top:0;">🔄 What You Can Do</h3>
                            <ul style="color:#333; font-size:14px;">
                                <li>Review the feedback above</li>
                                <li>Update your application with the required information</li>
                                <li>Re-submit your application for review</li>
                                <li>Contact support if you need assistance</li>
                            </ul>
                        </div>

                        <p style="font-size:14px; color:#666;">We're here to help you become a successful host. Please don't hesitate to reach out if you have any questions.</p>

                        <div style="text-align:center; margin-top:30px;">
                            <p style="font-size:12px; color:#999;">Thank you for your interest in joining our platform.</p>
                        </div>
                    </div>
                </div>
            `;

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: host.email,
                subject: "⚠️ Update on Your Host Application",
                html: emailHtml,
            });
            console.log(`📨 Host rejection email sent to ${host.email}`);
        }
    } catch (emailError) {
        console.error('Failed to send host rejection email:', emailError);
        // Don't fail the rejection if email fails
    }

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
    const vehicle = await Vehicle.findById(vehicleId).populate('host');

    if (!vehicle) {
        throw new Error("Vehicle not found");
    }

    vehicle.approvalStatus = "approved";
    vehicle.rejectionReason = undefined;
    await vehicle.save();

    // Send approval email notification to host
    try {
        const host = vehicle.host as any;
        if (host?.email) {
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; background:#f9f9f9; padding:20px;">
                    <div style="max-width:600px; margin:auto; background:#fff; padding:30px; border-radius:12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align:center; margin-bottom:20px;">
                            <h1 style="color:#28a745; margin:0;">🚗 Vehicle Approved!</h1>
                        </div>
                        <p style="font-size:16px; color:#333;">Hi ${host.name || host.username || 'there'},</p>
                        <p style="font-size:16px; color:#333;">Great news! Your vehicle listing has been approved and is now live on our platform.</p>

                        <div style="background:#e8f5e9; padding:20px; border-radius:8px; margin:20px 0;">
                            <h3 style="color:#2e7d32; margin-top:0;">✅ Vehicle Details</h3>
                            <table style="width:100%; font-size:14px; color:#555;">
                                <tr><td style="padding:8px 0;"><strong>Vehicle:</strong></td><td>${vehicle.name}</td></tr>
                                <tr><td style="padding:8px 0;"><strong>Daily Rate:</strong></td><td>$${vehicle.rent}</td></tr>
                                <tr><td style="padding:8px 0;"><strong>Status:</strong></td><td style="color:#28a745; font-weight:bold;">Active & Available</td></tr>
                            </table>
                        </div>

                        <div style="background:#f8f9fa; padding:20px; border-radius:8px; margin:20px 0;">
                            <h3 style="color:#2976BA; margin-top:0;">💡 Next Steps</h3>
                            <ul style="color:#333; font-size:14px;">
                                <li>Your vehicle is now visible to potential renters</li>
                                <li>You'll receive booking notifications via email</li>
                                <li>Ensure your vehicle is ready for rentals</li>
                                <li>Monitor your earnings in the dashboard</li>
                            </ul>
                        </div>

                        <p style="font-size:14px; color:#666;">Congratulations on your approved listing! We wish you success with your rentals.</p>

                        <div style="text-align:center; margin-top:30px;">
                            <p style="font-size:12px; color:#999;">Thank you for being a valued host!</p>
                        </div>
                    </div>
                </div>
            `;

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: host.email,
                subject: `🚗 Vehicle Approved: ${vehicle.name} is now live!`,
                html: emailHtml,
            });
            console.log(`📨 Vehicle approval email sent to ${host.email} for vehicle ${vehicle.name}`);
        }
    } catch (emailError) {
        console.error('Failed to send vehicle approval email:', emailError);
        // Don't fail the approval if email fails
    }

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
    const vehicle = await Vehicle.findById(vehicleId).populate('host');

    if (!vehicle) {
        throw new Error("Vehicle not found");
    }

    vehicle.approvalStatus = "rejected";
    vehicle.rejectionReason = reason;
    await vehicle.save();

    // Send rejection email notification to host
    try {
        const host = vehicle.host as any;
        if (host?.email) {
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; background:#f9f9f9; padding:20px;">
                    <div style="max-width:600px; margin:auto; background:#fff; padding:30px; border-radius:12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align:center; margin-bottom:20px;">
                            <h1 style="color:#dc3545; margin:0;">⚠️ Vehicle Listing Update</h1>
                        </div>
                        <p style="font-size:16px; color:#333;">Hi ${host.name || host.username || 'there'},</p>
                        <p style="font-size:16px; color:#333;">We have reviewed your vehicle listing and it requires some updates before it can be approved.</p>

                        <div style="background:#fff3cd; padding:20px; border-radius:8px; margin:20px 0; border-left: 4px solid #ffc107;">
                            <h3 style="color:#856404; margin-top:0;">📝 Vehicle: ${vehicle.name}</h3>
                            <p style="color:#333; font-size:14px; margin:0;"><strong>Reason for Review:</strong></p>
                            <p style="color:#333; font-size:14px; margin:5px 0;">${reason}</p>
                        </div>

                        <div style="background:#f8f9fa; padding:20px; border-radius:8px; margin:20px 0;">
                            <h3 style="color:#2976BA; margin-top:0;">🔄 What You Can Do</h3>
                            <ul style="color:#333; font-size:14px;">
                                <li>Review the feedback above</li>
                                <li>Update your vehicle listing with the required information</li>
                                <li>Re-submit your listing for approval</li>
                                <li>Contact support if you need help</li>
                            </ul>
                        </div>

                        <p style="font-size:14px; color:#666;">We're committed to maintaining high-quality listings on our platform. Please make the necessary updates and re-submit.</p>

                        <div style="text-align:center; margin-top:30px;">
                            <p style="font-size:12px; color:#999;">Thank you for your understanding.</p>
                        </div>
                    </div>
                </div>
            `;

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: host.email,
                subject: `⚠️ Update on Your Vehicle Listing: ${vehicle.name}`,
                html: emailHtml,
            });
            console.log(`📨 Vehicle rejection email sent to ${host.email} for vehicle ${vehicle.name}`);
        }
    } catch (emailError) {
        console.error('Failed to send vehicle rejection email:', emailError);
        // Don't fail the rejection if email fails
    }

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

/**
 * Delete vehicle
 */
export const deleteVehicle = async (vehicleId: string) => {
    const vehicle = await Vehicle.findById(vehicleId).populate('host');

    if (!vehicle) {
        throw new Error("Vehicle not found");
    }

    // Check if vehicle has any active bookings
    const activeBookings = await Booking.countDocuments({
        vehicle: vehicleId,
        bookingStatus: { $in: ["in-progress", "active"] }
    });

    if (activeBookings > 0) {
        throw new Error("Cannot delete vehicle with active bookings. Cancel all active bookings first.");
    }

    // Get vehicle details before deletion for response
    const vehicleDetails = {
        id: vehicle._id,
        name: vehicle.name,
        host: vehicle.host
    };

    // Delete the vehicle
    await Vehicle.findByIdAndDelete(vehicleId);

    // Send notification email to host
    try {
        const host = vehicle.host as any;
        if (host?.email) {
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; background:#f9f9f9; padding:20px;">
                    <div style="max-width:600px; margin:auto; background:#fff; padding:30px; border-radius:12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align:center; margin-bottom:20px;">
                            <h1 style="color:#dc3545; margin:0;">🗑️ Vehicle Listing Removed</h1>
                        </div>
                        <p style="font-size:16px; color:#333;">Hi ${host.name || host.username || 'there'},</p>
                        <p style="font-size:16px; color:#333;">We wanted to inform you that your vehicle listing has been removed from our platform by an administrator.</p>

                        <div style="background:#fff3cd; padding:20px; border-radius:8px; margin:20px 0; border-left: 4px solid #ffc107;">
                            <h3 style="color:#856404; margin-top:0;">🚗 Removed Vehicle</h3>
                            <p style="color:#333; font-size:14px; margin:0;"><strong>${vehicle.name}</strong></p>
                        </div>

                        <div style="background:#f8f9fa; padding:20px; border-radius:8px; margin:20px 0;">
                            <h3 style="color:#2976BA; margin-top:0;">ℹ️ Important Information</h3>
                            <ul style="color:#333; font-size:14px;">
                                <li>If you believe this was done in error, please contact support</li>
                                <li>You can re-list your vehicle if it meets our requirements</li>
                                <li>Check your account for any related notifications</li>
                            </ul>
                        </div>

                        <p style="font-size:14px; color:#666;">If you have any questions about this action, please don't hesitate to contact our support team.</p>

                        <div style="text-align:center; margin-top:30px;">
                            <p style="font-size:12px; color:#999;">Thank you for your understanding.</p>
                        </div>
                    </div>
                </div>
            `;

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: host.email,
                subject: `🗑️ Vehicle Listing Removed: ${vehicle.name}`,
                html: emailHtml,
            });
            console.log(`📨 Vehicle deletion notification sent to ${host.email} for vehicle ${vehicle.name}`);
        }
    } catch (emailError) {
        console.error('Failed to send vehicle deletion email:', emailError);
        // Don't fail the deletion if email fails
    }

    return {
        success: true,
        message: "Vehicle deleted successfully",
        vehicle: vehicleDetails,
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
