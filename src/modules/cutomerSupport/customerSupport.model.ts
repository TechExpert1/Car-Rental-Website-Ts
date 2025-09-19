import mongoose, { Schema, Document } from "mongoose";

export interface ICustomerSupport extends Document {
  name: string;
  email: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

const customerSupportSchema = new Schema<ICustomerSupport>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<ICustomerSupport>(
  "Customer_Support",
  customerSupportSchema
);
