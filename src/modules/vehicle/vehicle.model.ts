import mongoose, { Document, Schema, Model } from "mongoose";

// Interface for TypeScript
export interface IVehicle extends Document {
  name: string;
  host: mongoose.Types.ObjectId;
  vehicleModel?: string;
  type?: string;
  images?: string[];
  rent: number;

  technicalSpecifications?: {
    gearBox?: string;
    fuelType?: string;
    doors?: number;
    seats?: number;
    airConditioner?: boolean;
    distance?: number;
    speed?: number;
  };

  equipment?: {
    break?: string;
    airBags?: number;
    cruiseControl?: boolean;
    location: {
      type: "Point";
      coordinates: [number, number];
      address?: string;
    };
  };

  status: "active" | "de-activated";
  deactivationEndDate?: Date;

  // Vehicle approval fields
  description?: string;
  legalDocuments?: string; // URL to uploaded legal documents
  approvalStatus?: "pending" | "approved" | "rejected";
  rejectionReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Schema
const vehicleSchema: Schema<IVehicle> = new Schema<IVehicle>(
  {
    name: { type: String, required: true },
    host: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vehicleModel: { type: String },
    type: { type: String },
    images: [{ type: String }],
    rent: { type: Number, required: true },

    technicalSpecifications: {
      gearBox: { type: String },
      fuelType: { type: String },
      doors: { type: Number },
      seats: { type: Number },
      airConditioner: { type: Boolean },
      distance: { type: Number },
      speed: { type: Number },
    },

    equipment: {
      break: { type: String },
      airBags: { type: Number },
      cruiseControl: { type: Boolean },
      location: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number],
          required: true,
        },
        address: { type: String },
      },
    },
    status: {
      type: String,
      enum: ["active", "de-activated"],
      default: "active",
    },
    deactivationEndDate: { type: Date },

    // Vehicle approval fields
    description: { type: String },
    legalDocuments: { type: String },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

// Add 2dsphere index for geospatial queries (sorting by distance)
vehicleSchema.index({ "equipment.location": "2dsphere" });

// Export model
const Vehicle: Model<IVehicle> = mongoose.model<IVehicle>(
  "Vehicle",
  vehicleSchema
);
export default Vehicle;
