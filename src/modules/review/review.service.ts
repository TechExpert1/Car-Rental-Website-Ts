import { Request } from "express";
import mongoose from "mongoose";
import Review, { IReview } from "./review.model";
import AuthRequest from "../../middlewares/userAuth";
import Vehicle from "../vehicle/vehicle.model";
import { createNotification } from "../notifications/notification.service";
export const handleCreateReview = async (req: AuthRequest) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new Error("User not authenticated");

    const { vehicle, text } = req.body as { vehicle?: string; text?: string };

    if (!vehicle) throw new Error("vehicle is required");
    if (!text) throw new Error("text is required");

    // Collect media URLs from both form fields and uploaded S3 files
    const mediaFromBody: string[] = Array.isArray(req.body.media)
      ? req.body.media
      : req.body.media
      ? [req.body.media]
      : [];

    const uploadedFilesMap = req.fileUrls || {};
    const uploadedFiles: string[] = Object.values(uploadedFilesMap).flat();

    const media = [...mediaFromBody, ...uploadedFiles];

    // Parse and validate numeric rating fields (optional, but must be 0-5 if provided)
    const parseRating = (val: any): number | undefined => {
      if (val === undefined || val === null || val === '') return undefined;
      const n = Number(val);
      if (Number.isNaN(n) || n < 0 || n > 5) throw new Error('Rating values must be numbers between 0 and 5');
      return n;
    };

    const conditionAccuracy = parseRating(req.body.conditionAccuracy);
    const pickupEase = parseRating(req.body.pickupEase);
    const communication = parseRating(req.body.communication);

    // Compute overall rating average of provided aspects
    const ratingValues = [conditionAccuracy, pickupEase, communication].filter((v) => typeof v === 'number') as number[];
    const rating = ratingValues.length > 0 ? Number((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length).toFixed(2)) : undefined;

    const reviewData: Partial<IReview> = {
      user: new mongoose.Types.ObjectId(userId) as any,
      vehicle: new mongoose.Types.ObjectId(vehicle) as any,
      text: text as any,
      name: (req.body.name as string) || (req.user?.username as string) || (req.user?.email as string) || "",
      email: (req.body.email as string) || (req.user?.email as string) || "",
      media,
      conditionAccuracy,
      pickupEase,
      communication,
      rating,
    };

    const review = await Review.create(reviewData);

    // Notify host about the new review
    try {
      const vehicleDoc: any = await Vehicle.findById(vehicle).select("host name");
      if (vehicleDoc && vehicleDoc.host) {
        const hostId = vehicleDoc.host.toString();
        const reviewerName = (req.user as any)?.name || (req.user?.username as string) || 'A guest';
        const title = '⭐ New Review Received!';
        const ratingText = rating ? ` (${rating.toFixed(1)}/5 stars)` : '';
        const message = `${reviewerName} left a review${ratingText} on your ${vehicleDoc.name}. Check it out!`;
        // Fire and forget
        const reviewId = (review as any)._id ? (review as any)._id.toString() : undefined;
        createNotification(hostId, 'review_received', title, message, { reviewId, vehicleId: vehicle, rating, reviewerName });
      }
    } catch (notifyErr) {
      console.error("Failed to notify host about new review:", notifyErr);
    }

    return { message: "Review created successfully", review };
  } catch (error) {
    console.error("Create Review Error:", error);
    throw error;
  }
};

export const handleGetAllReviews = async (req: Request) => {
  try {
    let { page = 1, limit = 10, vehicle, mine, ...filters } = req.query;
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);

    const query: Record<string, any> = {};

    // Exact filter by vehicle id if provided
    if (vehicle) {
      try {
        query.vehicle = new mongoose.Types.ObjectId(vehicle as string);
      } catch (err) {
        throw new Error("Invalid vehicle id");
      }
    }

    // If `mine=true` or route is `/mine`, return reviews for the authenticated user
    if (mine === 'true' || (req as any).path && (req as any).path.includes('/mine')) {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      if (!userId) throw new Error('Authentication required for mine=true');

      // If host, return reviews for all vehicles owned by host
      if (authReq.user?.role === 'host') {
        const vehicles = await Vehicle.find({ host: userId }).select('_id');
        const vehicleIds = vehicles.map((v: any) => v._id);
        // If host has no vehicles, return empty set
        if (vehicleIds.length === 0) {
          return { reviews: [], pagination: { total: 0, page: pageNumber, limit: limitNumber, totalPages: 0 } };
        }
        query.vehicle = { $in: vehicleIds };
      } else {
        // Customer: return reviews created by this user
        query.user = new mongoose.Types.ObjectId(userId);
      }
    }

    // Apply additional filters (regex-based for string fields)
    Object.keys(filters).forEach((key) => {
      const value = filters[key] as string;
      if (value && key !== 'page' && key !== 'limit') {
        query[key] = { $regex: value, $options: "i" };
      }
    });

    const total = await Review.countDocuments(query);
    const reviews = await Review.find(query)
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .populate("user", "name email image username")
      .populate("vehicle", "name images");

    return {
      reviews,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    };
  } catch (error) {
    console.error("Get All Reviews Error:", error);
    throw error;
  }
};

export const handleUpdateReview = async (req: AuthRequest) => {
  try {
    const { id } = req.params;
    const review: IReview | null = await Review.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!review) throw new Error("Review not found");
    return { message: "Review updated successfully", review };
  } catch (error) {
    console.error("Update Review Error:", error);
    throw error;
  }
};

export const handleDeleteReview = async (req: AuthRequest) => {
  try {
    const { id } = req.params;
    const review = await Review.findByIdAndDelete(id);
    if (!review) throw new Error("Review not found");
    return { message: "Review deleted successfully", review };
  } catch (error) {
    console.error("Delete Review Error:", error);
    throw error;
  }
};

export const handleGetByIdReview = async (req: AuthRequest) => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id)
      .populate('user', 'name email image username')
      .populate('vehicle', 'name images');
    if (!review) throw new Error("Review not found");
    return { message: "Review Fetched successfully", review };
  } catch (error) {
    console.error("Delete Review Error:", error);
    throw error;
  }
};


