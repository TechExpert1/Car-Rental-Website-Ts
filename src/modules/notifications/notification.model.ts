import mongoose, { Document, Schema, Model } from "mongoose";

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  type: string; // e.g., booking_confirmed, payout_processed, review_received
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema: Schema<INotification> = new Schema<INotification>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    data: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const Notification: Model<INotification> = mongoose.model<INotification>("Notification", notificationSchema);
export default Notification;
