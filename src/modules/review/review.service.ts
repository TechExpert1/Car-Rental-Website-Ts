import { Request } from "express";
import Review, { IReview } from "./review.model";
import AuthRequest from "../../middlewares/userAuth";
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

    const reviewData: Partial<IReview> = {
      user: userId as any,
      vehicle: vehicle as any,
      text: text as any,
      name: (req.body.name as string) || (req.user?.username as string) || (req.user?.email as string) || "",
      email: (req.body.email as string) || (req.user?.email as string) || "",
      media,
    };

    const review = await Review.create(reviewData);
    return { message: "Review created successfully", review };
  } catch (error) {
    console.error("Create Review Error:", error);
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
    const review = await Review.findById(id);
    if (!review) throw new Error("Review not found");
    return { message: "Review Fetched successfully", review };
  } catch (error) {
    console.error("Delete Review Error:", error);
    throw error;
  }
};

export const handleGetAllReviews = async (req: Request) => {
  try {
    let { page = 1, limit = 10, ...filters } = req.query;
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);

    const query: Record<string, any> = {};
    Object.keys(filters).forEach((key) => {
      const value = filters[key] as string;
      if (value) query[key] = { $regex: value, $options: "i" };
    });

    const total = await Review.countDocuments(query);
    const reviews = await Review.find(query)
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .populate("user", "name email") // optional
      .populate("vehicle", "name"); // optional

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
