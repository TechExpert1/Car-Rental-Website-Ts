import mongoose, { Document, Schema, Model } from "mongoose";

export interface IRating extends Document {
  booking: mongoose.Types.ObjectId;
  ratedBy: mongoose.Types.ObjectId;
  ratedUser: mongoose.Types.ObjectId;
  ratingType: "host_to_guest" | "guest_to_host";

  // Guest ratings (by host)
  guestRatings?: {
    cleanliness: number; // 1-5
    communication: number; // 1-5
    punctuality: number; // 1-5
    ruleCompliance: number; // 1-5
  };

  // Host ratings (by guest)
  hostRatings?: {
    carCondition: number; // 1-5
    pickupDropoff: number; // 1-5
    communication: number; // 1-5
  };

  overallRating: number; // Average of all ratings
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ratingSchema: Schema<IRating> = new Schema<IRating>(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    ratedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ratedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ratingType: {
      type: String,
      enum: ["host_to_guest", "guest_to_host"],
      required: true,
    },
    guestRatings: {
      cleanliness: { type: Number, min: 1, max: 5 },
      communication: { type: Number, min: 1, max: 5 },
      punctuality: { type: Number, min: 1, max: 5 },
      ruleCompliance: { type: Number, min: 1, max: 5 },
    },
    hostRatings: {
      carCondition: { type: Number, min: 1, max: 5 },
      pickupDropoff: { type: Number, min: 1, max: 5 },
      communication: { type: Number, min: 1, max: 5 },
    },
    overallRating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true },
  },
  { timestamps: true }
);

// Index to ensure one rating per booking per user
ratingSchema.index({ booking: 1, ratedBy: 1 }, { unique: true });

const Rating: Model<IRating> = mongoose.model<IRating>("Rating", ratingSchema);
export default Rating;
