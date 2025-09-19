import mongoose, { Document, Schema, Model } from "mongoose";

export interface IReview extends Document {
  user: mongoose.Types.ObjectId;
  vehicle: mongoose.Types.ObjectId;
  text: string;
  name: string;
  email: string;
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
    media: { type: [String], default: [] },
  },
  { timestamps: true }
);

const Review: Model<IReview> = mongoose.model<IReview>("Review", reviewSchema);
export default Review;
