import mongoose, { Document, Schema, Model } from "mongoose";

// Interface for TypeScript
export interface IUser extends Document {
  email: string;
  username: string;
  name?: string;
  password: string;
  image?: string;
  resetOTP?: string;
  otpExpiry?: Date;
  role: "customer" | "host";
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
    image: { type: String },
    resetOTP: { type: String },
    otpExpiry: { type: Date },
    role: {
      type: String,
      enum: ["customer", "host"],
      default: "customer",
      required: true,
    },
  },
  { timestamps: true }
);

// Export model
const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);
export default User;
