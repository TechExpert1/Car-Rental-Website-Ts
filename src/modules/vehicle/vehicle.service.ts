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

    // Handle uploaded images from S3
    if (req.fileUrls && req.fileUrls.images) {
      data.images = req.fileUrls.images;
    }

    const vehicle = await Vehicle.create(data);

    return { message: "Vehicle created successfully", vehicle };
  } catch (error) {
    console.error("Create Vehicle Error:", error);
    throw error;
  }
};

export const handleGetAllVehicles = async (req: AuthRequest) => {
  try {
    let { page = "1", limit = "10", ...filters } = req.query;

    const parsedPage = parseInt(page as string, 10);
    const parsedLimit = parseInt(limit as string, 10);

    const query: Record<string, any> = {};
    
    // If user is authenticated
    if (req.user?.id) {
      if (req.user.role === "host") {
        // Host sees their own vehicles (all statuses)
        query.host = req.user.id;
      } else if (req.user.role === "customer") {
        // Customer sees only active vehicles
        query.status = "active";
      }
    } else {
      // Unauthenticated users see only active vehicles
      query.status = "active";
    }
    
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
    const { deleteImages, ...updateData } = req.body;

    // Fetch current vehicle
    const vehicle: IVehicle | null = await Vehicle.findById(id);
    if (!vehicle) throw new Error("Vehicle not found");

    // Handle image deletion
    let currentImages = vehicle.images || [];
    if (deleteImages) {
      const imagesToDelete = Array.isArray(deleteImages) 
        ? deleteImages 
        : JSON.parse(deleteImages);
      currentImages = currentImages.filter(
        (img) => !imagesToDelete.includes(img)
      );
    }

    // Handle new image uploads from S3 - ADD to existing images
    if (req.fileUrls && req.fileUrls.images) {
      currentImages = [...currentImages, ...req.fileUrls.images];
    }

    updateData.images = currentImages;

    const updatedVehicle: IVehicle | null = await Vehicle.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!updatedVehicle) throw new Error("Vehicle not found");
    return { message: "Vehicle updated successfully", vehicle: updatedVehicle };
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

export const handleDeactivateVehicle = async (req: AuthRequest) => {
  try {
    if (!req.user?.id)
      throw new Error("Need a user Id - req.user.id is missing");

    const { id } = req.params;
    const vehicle: IVehicle | null = await Vehicle.findByIdAndUpdate(
      id,
      { status: "de-activated" },
      { new: true }
    );
    if (!vehicle) throw new Error("Vehicle not found");
    return { message: "Vehicle deactivated successfully", vehicle };
  } catch (error) {
    console.error("Deactivate Vehicle Error:", error);
    throw error;
  }
};

export const handleActivateVehicle = async (req: AuthRequest) => {
  try {
    if (!req.user?.id)
      throw new Error("Need a user Id - req.user.id is missing");

    const { id } = req.params;
    const vehicle: IVehicle | null = await Vehicle.findByIdAndUpdate(
      id,
      { status: "active" },
      { new: true }
    );
    if (!vehicle) throw new Error("Vehicle not found");
    return { message: "Vehicle activated successfully", vehicle };
  } catch (error) {
    console.error("Activate Vehicle Error:", error);
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
