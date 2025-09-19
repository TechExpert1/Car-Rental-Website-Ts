import { Request } from "express";
import Vehicle, { IVehicle } from "./vehicle.model";
import AuthRequest from "../../middlewares/userAuth";
import Review from "../review/review.model";
export const handleCreateVehicle = async (req: AuthRequest) => {
  try {
    if (!req.user?.id)
      throw new Error("Need a user Id - req.user.id is missing");

    const data = {
      host: req.user.id,
      ...req.body,
    };

    const vehicle = await Vehicle.create(data);

    return { message: "Vehicle created successfully", vehicle };
  } catch (error) {
    console.error("Create Vehicle Error:", error);
    throw error;
  }
};

export const handleGetAllVehicles = async (req: Request) => {
  try {
    let { page = "1", limit = "10", ...filters } = req.query;

    const parsedPage = parseInt(page as string, 10);
    const parsedLimit = parseInt(limit as string, 10);

    const query: Record<string, any> = {};
    Object.keys(filters).forEach((key) => {
      const value = filters[key];
      if (value) {
        query[key] = { $regex: value, $options: "i" };
      }
    });

    const total = await Vehicle.countDocuments(query);

    const vehicles: IVehicle[] = await Vehicle.find(query)
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);

    return {
      vehicles,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit),
      },
    };
  } catch (error) {
    console.error("Get All Vehicles Error:", error);
    throw error;
  }
};

export const handleGetVehicleById = async (req: Request) => {
  try {
    const { id } = req.params;
    const vehicle: IVehicle | null = await Vehicle.findById(id).populate(
      "host"
    );
    if (!vehicle) throw new Error("Vehicle not found");
    return { vehicle };
  } catch (error) {
    console.error("Get Vehicle By ID Error:", error);
    throw error;
  }
};

export const handleUpdateVehicle = async (req: AuthRequest) => {
  try {
    if (!req.user?.id)
      throw new Error("Need a user Id - req.user.id is missing");

    const { id } = req.params;
    const vehicle: IVehicle | null = await Vehicle.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!vehicle) throw new Error("Vehicle not found");
    return { message: "Vehicle updated successfully", vehicle };
  } catch (error) {
    console.error("Update Vehicle Error:", error);
    throw error;
  }
};

export const handleVehicleReviews = async (req: Request) => {
  try {
    const { id } = req.params;
    const reviews = await Review.find({ vehicle: id }).populate("user");
    return { reviews };
  } catch (error) {
    console.error("Update Vehicle Error:", error);
    throw error;
  }
};

export const handleDeleteVehicle = async (req: AuthRequest) => {
  try {
    const { id } = req.params;
    const vehicle: IVehicle | null = await Vehicle.findByIdAndDelete(id);
    if (!vehicle) throw new Error("Vehicle not found");
    return { message: "Vehicle deleted successfully" };
  } catch (error) {
    console.error("Delete Vehicle Error:", error);
    throw error;
  }
};
