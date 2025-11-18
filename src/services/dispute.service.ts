import Dispute from "../modules/dispute/dispute.model";
import Booking from "../modules/booking/booking.model";
import mongoose from "mongoose";

/**
 * Create a new dispute
 * Must be reported within 24 hours of car return
 */
export const createDispute = async (
  bookingId: string,
  reportedById: string,
  disputeType: "damage" | "cleanliness" | "late_return" | "other",
  description: string,
  evidence: string[]
): Promise<any> => {
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.bookingStatus !== "completed") {
    throw new Error("Disputes can only be filed for completed bookings");
  }

  // Check if dispute is filed within 24 hours of car return
  const now = new Date();
  const returnDate = booking.tripCompletedAt || new Date(booking.dropoffDate);
  const hoursSinceReturn =
    (now.getTime() - returnDate.getTime()) / (1000 * 60 * 60);

  if (hoursSinceReturn > 24) {
    throw new Error(
      "Disputes must be reported within 24 hours of car return"
    );
  }

  // Determine who is being reported
  const reportedById_obj = new mongoose.Types.ObjectId(reportedById);
  let reportedAgainstId: mongoose.Types.ObjectId;

  if (booking.user.equals(reportedById_obj)) {
    reportedAgainstId = booking.host;
  } else if (booking.host.equals(reportedById_obj)) {
    reportedAgainstId = booking.user;
  } else {
    throw new Error("Reporter must be either the guest or the host");
  }

  // Create dispute
  const dispute = await Dispute.create({
    booking: bookingId,
    reportedBy: reportedById,
    reportedAgainst: reportedAgainstId,
    disputeType,
    description,
    evidence,
    reportedAt: now,
    status: "open",
  });

  return {
    success: true,
    message: "Dispute created successfully",
    dispute: {
      id: dispute._id,
      bookingId: dispute.booking,
      disputeType: dispute.disputeType,
      status: dispute.status,
      reportedAt: dispute.reportedAt,
    },
  };
};

/**
 * Get all disputes (admin)
 */
export const getAllDisputes = async (
  status?: string,
  limit: number = 50
): Promise<any> => {
  const query: any = {};
  if (status) {
    query.status = status;
  }

  const disputes = await Dispute.find(query)
    .populate("booking")
    .populate("reportedBy", "name email")
    .populate("reportedAgainst", "name email")
    .sort({ createdAt: -1 })
    .limit(limit);

  return disputes;
};

/**
 * Get dispute by ID
 */
export const getDisputeById = async (disputeId: string): Promise<any> => {
  const dispute = await Dispute.findById(disputeId)
    .populate("booking")
    .populate("reportedBy", "name email username")
    .populate("reportedAgainst", "name email username")
    .populate("resolution.resolvedBy", "name email");

  if (!dispute) {
    throw new Error("Dispute not found");
  }

  return dispute;
};

/**
 * Resolve dispute (admin only)
 */
export const resolveDispute = async (
  disputeId: string,
  resolvedById: string,
  action: string,
  securityDepositDeduction: number,
  notes: string
): Promise<any> => {
  const dispute = await Dispute.findById(disputeId);

  if (!dispute) {
    throw new Error("Dispute not found");
  }

  if (dispute.status === "resolved") {
    throw new Error("Dispute is already resolved");
  }

  // Update dispute
  dispute.status = "resolved";
  dispute.resolution = {
    resolvedBy: new mongoose.Types.ObjectId(resolvedById),
    resolvedAt: new Date(),
    action,
    securityDepositDeduction,
    notes,
  };

  await dispute.save();

  // If security deposit deduction, update booking
  if (securityDepositDeduction > 0) {
    const booking = await Booking.findById(dispute.booking);
    if (booking) {
      booking.securityDepositStatus = "deducted";
      await booking.save();
    }
  } else {
    // Release security deposit
    const booking = await Booking.findById(dispute.booking);
    if (booking) {
      booking.securityDepositStatus = "released";
      await booking.save();
    }
  }

  return {
    success: true,
    message: "Dispute resolved successfully",
    dispute: {
      id: dispute._id,
      status: dispute.status,
      resolution: dispute.resolution,
    },
  };
};

/**
 * Reject dispute (admin only)
 */
export const rejectDispute = async (
  disputeId: string,
  resolvedById: string,
  notes: string
): Promise<any> => {
  const dispute = await Dispute.findById(disputeId);

  if (!dispute) {
    throw new Error("Dispute not found");
  }

  if (dispute.status === "resolved" || dispute.status === "rejected") {
    throw new Error("Dispute is already closed");
  }

  dispute.status = "rejected";
  dispute.resolution = {
    resolvedBy: new mongoose.Types.ObjectId(resolvedById),
    resolvedAt: new Date(),
    action: "Rejected",
    securityDepositDeduction: 0,
    notes,
  };

  await dispute.save();

  // Release security deposit
  const booking = await Booking.findById(dispute.booking);
  if (booking) {
    booking.securityDepositStatus = "released";
    await booking.save();
  }

  return {
    success: true,
    message: "Dispute rejected successfully",
    dispute: {
      id: dispute._id,
      status: dispute.status,
    },
  };
};
