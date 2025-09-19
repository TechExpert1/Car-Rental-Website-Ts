import mongoose, { Document, Schema, Model } from "mongoose";

// Interface for TypeScript
export interface IBooking extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  host: mongoose.Types.ObjectId;
  vehicle: mongoose.Types.ObjectId;
  paymentIntentId?: string;
  paymentStatus: "pending" | "succeeded" | "failed";
  bookingStatus: "in-progress" | "completed" | "canceled";
  totalAmount: number;
  totalDays: number;
  pickupDate: Date;
  dropoffDate: Date;
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
      enum: ["pending", "succeeded", "failed"],
      default: "pending",
    },
    bookingStatus: {
      type: String,
      enum: ["in-progress", "completed", "canceled"],
      default: "in-progress",
    },
    totalAmount: { type: Number, required: true },
    totalDays: { type: Number, required: true },
    pickupDate: { type: Date, required: true },
    dropoffDate: { type: Date, required: true },
  },
  { timestamps: true }
);

// Export model
const Booking: Model<IBooking> = mongoose.model<IBooking>(
  "Booking",
  bookingSchema
);
export default Booking;
