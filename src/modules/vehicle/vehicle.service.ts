import { Request } from "express";
import Vehicle, { IVehicle } from "./vehicle.model";
import AuthRequest from "../../middlewares/userAuth";
import Review from "../review/review.model";
import mongoose from "mongoose";
import Booking from "../booking/booking.model";

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
    let { page = "1", limit = "10", lat, lng, maxDistance, ...filters } = req.query;

    const parsedPage = parseInt(page as string, 10);
    const parsedLimit = parseInt(limit as string, 10);

    // Parse location parameters
    const latitude = lat ? parseFloat(lat as string) : null;
    const longitude = lng ? parseFloat(lng as string) : null;
    // Default max distance: 50km (in meters for MongoDB)
    const maxDistanceMeters = maxDistance
      ? parseFloat(maxDistance as string) * 1000
      : 50000; // 50km default

    const matchQuery: Record<string, any> = {};

    // If user is authenticated
    if (req.user?.id) {
      if (req.user.role === "host") {
        // Host sees their own vehicles (all statuses)
        matchQuery.host = new mongoose.Types.ObjectId(req.user.id);
      } else if (req.user.role === "customer") {
        // Customer sees only active vehicles
        matchQuery.status = "active";
      }
    } else {
      // Unauthenticated users see only active vehicles
      matchQuery.status = "active";
    }

    // Apply additional filters (regex-based for string fields)
    Object.keys(filters).forEach((key) => {
      const value = filters[key];
      if (value && key !== 'page' && key !== 'limit') {
        matchQuery[key] = { $regex: value, $options: "i" };
      }
    });

    // If location coordinates are provided, use geoNear aggregation
    if (latitude !== null && longitude !== null && !isNaN(latitude) && !isNaN(longitude)) {
      // Use $geoNear aggregation for distance-based sorting
      const aggregationPipeline: any[] = [
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [longitude, latitude], // GeoJSON uses [lng, lat] order
            },
            distanceField: "distance", // Field to add with calculated distance
            maxDistance: maxDistanceMeters, // Max distance in meters
            spherical: true,
            query: matchQuery,
          },
        },
        // Add distance in kilometers for easier reading
        {
          $addFields: {
            distanceKm: { $round: [{ $divide: ["$distance", 1000] }, 2] },
          },
        },
        // Lookup host information
        {
          $lookup: {
            from: "users",
            localField: "host",
            foreignField: "_id",
            as: "hostInfo",
          },
        },
        {
          $addFields: {
            host: {
              $cond: {
                if: { $gt: [{ $size: "$hostInfo" }, 0] },
                then: {
                  _id: { $arrayElemAt: ["$hostInfo._id", 0] },
                  username: { $arrayElemAt: ["$hostInfo.username", 0] },
                  image: { $arrayElemAt: ["$hostInfo.image", 0] },
                },
                else: "$host",
              },
            },
          },
        },
        { $unset: "hostInfo" },
        // Sort by distance (nearest first) - already sorted by $geoNear
        // Facet for pagination
        {
          $facet: {
            metadata: [{ $count: "total" }],
            data: [
              { $skip: (parsedPage - 1) * parsedLimit },
              { $limit: parsedLimit },
            ],
          },
        },
      ];

      const result = await Vehicle.aggregate(aggregationPipeline);

      const total = result[0]?.metadata[0]?.total || 0;
      const vehicles = result[0]?.data || [];

      // Get booked dates for all vehicles
      const vehicleIds = vehicles.map((v: any) => v._id);
      const bookings = await Booking.find({
        vehicle: { $in: vehicleIds },
        bookingStatus: { $in: ["active", "in-progress"] },
        dropoffDate: { $gte: new Date() }
      })
        .select("vehicle pickupDate dropoffDate")
        .lean();

      // Group booked dates by vehicle
      const bookedDatesMap: Record<string, Array<{ startDate: Date; endDate: Date }>> = {};
      bookings.forEach((booking) => {
        const vehicleId = booking.vehicle.toString();
        if (!bookedDatesMap[vehicleId]) {
          bookedDatesMap[vehicleId] = [];
        }
        bookedDatesMap[vehicleId].push({
          startDate: booking.pickupDate,
          endDate: booking.dropoffDate,
        });
      });

      // Add booked dates to each vehicle
      const vehiclesWithBookedDates = vehicles.map((vehicle: any) => ({
        ...vehicle,
        bookedDates: bookedDatesMap[vehicle._id.toString()] || [],
      }));

      return {
        vehicles: vehiclesWithBookedDates,
        pagination: {
          total,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: Math.ceil(total / parsedLimit),
        },
        location: {
          searchCoordinates: { lat: latitude, lng: longitude },
          maxDistanceKm: maxDistanceMeters / 1000,
          sortedByDistance: true,
        },
      };
    }

    // Standard query without location (original behavior)
    const total = await Vehicle.countDocuments(matchQuery);

    const vehicles = await Vehicle.find(matchQuery)
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit)
      .populate("host", "username image")
      .lean();

    // Get booked dates for all vehicles
    const vehicleIds = vehicles.map((v) => v._id);
    const bookings = await Booking.find({
      vehicle: { $in: vehicleIds },
      bookingStatus: { $in: ["active", "in-progress"] },
      dropoffDate: { $gte: new Date() }
    })
      .select("vehicle pickupDate dropoffDate")
      .lean();

    // Group booked dates by vehicle
    const bookedDatesMap: Record<string, Array<{ startDate: Date; endDate: Date }>> = {};
    bookings.forEach((booking) => {
      const vehicleId = booking.vehicle.toString();
      if (!bookedDatesMap[vehicleId]) {
        bookedDatesMap[vehicleId] = [];
      }
      bookedDatesMap[vehicleId].push({
        startDate: booking.pickupDate,
        endDate: booking.dropoffDate,
      });
    });

    // Add booked dates to each vehicle
    const vehiclesWithBookedDates = vehicles.map((vehicle) => ({
      ...vehicle,
      bookedDates: bookedDatesMap[vehicle._id.toString()] || [],
    }));

    return {
      vehicles: vehiclesWithBookedDates,
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
      "host",
      "username image"
    );
    if (!vehicle) throw new Error("Vehicle not found");

    // Get all active/in-progress bookings for this vehicle to show booked dates
    const bookings = await Booking.find({
      vehicle: id,
      bookingStatus: { $in: ["active", "in-progress"] },
      dropoffDate: { $gte: new Date() } // Only future/current bookings
    })
      .select("pickupDate dropoffDate")
      .sort({ pickupDate: 1 })
      .lean();

    // Format booked dates as an array of date ranges
    const bookedDates = bookings.map((booking) => ({
      startDate: booking.pickupDate,
      endDate: booking.dropoffDate,
    }));

    return { vehicle, bookedDates };
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
    const { endDate } = req.body;

    const updateData: any = { status: "de-activated" };

    // If endDate is provided, store it for auto-reactivation
    if (endDate) {
      updateData.deactivationEndDate = new Date(endDate);
    } else {
      // Clear endDate if not provided
      updateData.deactivationEndDate = null;
    }

    const vehicle: IVehicle | null = await Vehicle.findByIdAndUpdate(
      id,
      updateData,
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
      { status: "active", deactivationEndDate: null },
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
