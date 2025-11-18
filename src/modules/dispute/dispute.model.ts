// import mongoose, { Document, Schema, Model } from "mongoose";

// export interface IDispute extends Document {
//   booking: mongoose.Types.ObjectId;
//   reportedBy: mongoose.Types.ObjectId;
//   reportedAgainst: mongoose.Types.ObjectId;
//   disputeType: "damage" | "cleanliness" | "late_return" | "other";
//   description: string;
//   evidence: string[]; // URLs to images/documents
//   reportedAt: Date;
//   status: "open" | "under_review" | "resolved" | "rejected";
//   resolution?: {
//     resolvedBy: mongoose.Types.ObjectId;
//     resolvedAt: Date;
//     action: string;
//     securityDepositDeduction: number;
//     notes: string;
//   };
//   createdAt: Date;
//   updatedAt: Date;
// }

// const disputeSchema: Schema<IDispute> = new Schema<IDispute>(
//   {
//     booking: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Booking",
//       required: true,
//     },
//     reportedBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     reportedAgainst: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     disputeType: {
//       type: String,
//       enum: ["damage", "cleanliness", "late_return", "other"],
//       required: true,
//     },
//     description: { type: String, required: true, trim: true },
//     evidence: { type: [String], default: [] },
//     reportedAt: { type: Date, default: Date.now },
//     status: {
//       type: String,
//       enum: ["open", "under_review", "resolved", "rejected"],
//       default: "open",
//     },
//     resolution: {
//       resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//       resolvedAt: { type: Date },
//       action: { type: String },
//       securityDepositDeduction: { type: Number, default: 0 },
//       notes: { type: String },
//     },
//   },
//   { timestamps: true }
// );

// const Dispute: Model<IDispute> = mongoose.model<IDispute>(
//   "Dispute",
//   disputeSchema
// );
// export default Dispute;
