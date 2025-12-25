import mongoose, { Document, Schema, Model } from "mongoose";

export interface IReview extends Document {
  user: mongoose.Types.ObjectId;
  vehicle: mongoose.Types.ObjectId;
  text: string;
  name: string;
  email: string;
  // Ratings (0-5)
  conditionAccuracy?: number; // combined Car Condition & Accuracy
  pickupEase?: number; // Ease of pickup/drop-off
  communication?: number; // Host communication
  // Overall computed rating
  rating?: number;
  media: string[];
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema: Schema<IReview> = new Schema<IReview>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    text: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    // Ratings (0-5)
    conditionAccuracy: { type: Number, min: 0, max: 5 }, // combined Car Condition & Accuracy
    pickupEase: { type: Number, min: 0, max: 5 },
    communication: { type: Number, min: 0, max: 5 },
    // Overall computed rating (average of provided aspects)
    rating: { type: Number, min: 0, max: 5 },
    media: { type: [String], default: [] },
  },
  { timestamps: true }
);

const Review: Model<IReview> = mongoose.model<IReview>("Review", reviewSchema);
export default Review;
