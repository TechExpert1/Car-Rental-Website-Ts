import mongoose, { Document, Schema, Model } from "mongoose";

// Interface for TypeScript
export interface IBooking extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  host: mongoose.Types.ObjectId;
  vehicle: mongoose.Types.ObjectId;
  paymentIntentId?: string;
  paymentStatus: "pending" | "succeeded" | "failed" | "refunded" | "partially_refunded";
  bookingStatus: "in-progress" | "completed" | "canceled";
  totalAmount: number;
  totalDays: number;
  pickupDate: Date;
  dropoffDate: Date;

  // Cancellation fields
  canceledBy?: "user" | "host" | "admin";
  canceledAt?: Date;
  cancellationReason?: string;
  refundAmount?: number;
  refundPercentage?: number;
  hostPayoutAmount?: number;
  platformFeeAmount?: number;
  refundProcessedAt?: Date;

  // Host payout scheduling fields
  scheduledPayoutDate?: Date;
  payoutStatus?: "pending" | "processing" | "completed" | "failed";
  payoutProcessedAt?: Date;
  payoutTransferId?: string;

  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Schema
const bookingSchema: Schema<IBooking> = new Schema<IBooking>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    host: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    paymentIntentId: { type: String },
    paymentStatus: {
      type: String,
      enum: ["pending", "succeeded", "failed", "refunded", "partially_refunded"],
      default: "pending",
    },
    bookingStatus: {
      type: String,
      enum: ["in-progress", "active", "completed", "canceled"],
      default: "in-progress",
    },
    totalAmount: { type: Number, required: true },
    totalDays: { type: Number, required: true },
    pickupDate: { type: Date, required: true },
    dropoffDate: { type: Date, required: true },

    // Cancellation fields
    canceledBy: {
      type: String,
      enum: ["user", "host", "admin"]
    },
    canceledAt: { type: Date },
    cancellationReason: { type: String },
    refundAmount: { type: Number },
    refundPercentage: { type: Number },
    hostPayoutAmount: { type: Number },
    platformFeeAmount: { type: Number },
    refundProcessedAt: { type: Date },

    // Host payout scheduling fields
    scheduledPayoutDate: { type: Date },
    payoutStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending"
    },
    payoutProcessedAt: { type: Date },
    payoutTransferId: { type: String },
  },
  { timestamps: true }
);

// Export model
const Booking: Model<IBooking> = mongoose.model<IBooking>(
  "Booking",
  bookingSchema
);
export default Booking;
