import mongoose, { Document, Schema, Model } from "mongoose";

// Interface for TypeScript
export interface IUser extends Document {
  email: string;
  username: string;
  name?: string;
  password: string;
  image: string;
  resetOTP?: string;
  otpExpiry?: Date;
  role: "customer" | "host" | "admin";
  connected_acc_id?: string;
  connected_external_acc_id?: string;
  payouts_enabled?: boolean;
  total_revenue?: number;

  // Host-specific fields
  isVerifiedHost?: boolean;
  averageRating?: number;
  totalRatings?: number;
  totalCancellations?: number;
  totalCompletedTrips?: number;
  isFeaturedHost?: boolean;
  pendingPenaltyAmount?: number; // Amount to be deducted from next payout

  // Host verification fields
  identityNumber?: string;
  idCardProof?: string; // URL to uploaded ID card image
  addressProof?: string; // URL to uploaded address proof document
  hostApprovalStatus?: "pending" | "approved" | "rejected";
  hostRejectionReason?: string;
  accountStatus?: "active" | "inactive" | "banned";

  // Guest-specific fields
  averageGuestRating?: number;
  totalGuestRatings?: number;

  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Schema
const userSchema: Schema<IUser> = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    name: { type: String },
    password: { type: String, required: true },
    image: { type: String, default: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS2TgOv9CMmsUzYKCcLGWPvqcpUk6HXp2mnww&s" },
    resetOTP: { type: String },
    otpExpiry: { type: Date },
    connected_acc_id: { type: String, default: "none" },
    connected_external_acc_id: { type: String, default: "none" },
    payouts_enabled: { type: Boolean, default: false },
    total_revenue: { type: Number, default: 0 },
    role: {
      type: String,
      enum: ["customer", "host", "admin"],
      default: "customer",
      required: true,
    },

    // Host-specific fields
    isVerifiedHost: { type: Boolean, default: false },
    averageRating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
    totalCancellations: { type: Number, default: 0 },
    totalCompletedTrips: { type: Number, default: 0 },
    isFeaturedHost: { type: Boolean, default: false },
    pendingPenaltyAmount: { type: Number, default: 0 },

    // Host verification fields
    identityNumber: { type: String },
    idCardProof: { type: String },
    addressProof: { type: String },
    hostApprovalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"]
    },
    hostRejectionReason: { type: String },
    accountStatus: {
      type: String,
      enum: ["active", "inactive", "banned"],
      default: "active"
    },

    // Guest-specific fields
    averageGuestRating: { type: Number, default: 0 },
    totalGuestRatings: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Export model
const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);
export default User;
