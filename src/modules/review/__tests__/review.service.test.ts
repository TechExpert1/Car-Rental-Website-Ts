// src/modules/review/__tests__/review.service.test.ts
import Review from "../review.model";
import {
  handleCreateReview,
  handleUpdateReview,
  handleDeleteReview,
  handleGetByIdReview,
  handleGetAllReviews,
} from "../review.service";

jest.mock("../review.model");

describe("Review Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("handleCreateReview", () => {
    it("should create a review successfully", async () => {
      const mockReq: any = { body: { rating: 5, comment: "Excellent!" } };

      (Review.create as jest.Mock).mockResolvedValue({
        _id: "rev123",
        rating: 5,
        comment: "Excellent!",
      });

      const result = await handleCreateReview(mockReq);

      expect(Review.create).toHaveBeenCalledWith({
        rating: 5,
        comment: "Excellent!",
      });
      expect(result).toEqual({
        message: "Review created successfully",
        review: { _id: "rev123", rating: 5, comment: "Excellent!" },
      });
    });
  });

  describe("handleUpdateReview", () => {
    it("should update a review", async () => {
      const mockReq: any = {
        params: { id: "rev123" },
        body: { comment: "Updated comment" },
      };

      (Review.findByIdAndUpdate as jest.Mock).mockResolvedValue({
        _id: "rev123",
        comment: "Updated comment",
      });

      const result = await handleUpdateReview(mockReq);

      expect(Review.findByIdAndUpdate).toHaveBeenCalledWith(
        "rev123",
        { comment: "Updated comment" },
        { new: true, runValidators: true }
      );
      expect(result).toEqual({
        message: "Review updated successfully",
        review: { _id: "rev123", comment: "Updated comment" },
      });
    });

    it("should throw error if review not found", async () => {
      const mockReq: any = { params: { id: "rev999" }, body: {} };
      (Review.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      await expect(handleUpdateReview(mockReq)).rejects.toThrow(
        "Review not found"
      );
    });
  });

  describe("handleDeleteReview", () => {
    it("should delete a review", async () => {
      const mockReq: any = { params: { id: "rev123" } };

      (Review.findByIdAndDelete as jest.Mock).mockResolvedValue({
        _id: "rev123",
      });

      const result = await handleDeleteReview(mockReq);

      expect(Review.findByIdAndDelete).toHaveBeenCalledWith("rev123");
      expect(result).toEqual({
        message: "Review deleted successfully",
        review: { _id: "rev123" },
      });
    });

    it("should throw error if review not found", async () => {
      const mockReq: any = { params: { id: "rev999" } };
      (Review.findByIdAndDelete as jest.Mock).mockResolvedValue(null);

      await expect(handleDeleteReview(mockReq)).rejects.toThrow(
        "Review not found"
      );
    });
  });

  describe("handleGetByIdReview", () => {
    it("should return a review by ID", async () => {
      const mockReq: any = { params: { id: "rev123" } };

      (Review.findById as jest.Mock).mockResolvedValue({
        _id: "rev123",
        comment: "Great car",
      });

      const result = await handleGetByIdReview(mockReq);

      expect(Review.findById).toHaveBeenCalledWith("rev123");
      expect(result).toEqual({
        message: "Review Fetched successfully",
        review: { _id: "rev123", comment: "Great car" },
      });
    });

    it("should throw error if review not found", async () => {
      const mockReq: any = { params: { id: "rev999" } };
      (Review.findById as jest.Mock).mockResolvedValue(null);

      await expect(handleGetByIdReview(mockReq)).rejects.toThrow(
        "Review not found"
      );
    });
  });

  describe("handleGetAllReviews", () => {
    it("should return paginated reviews", async () => {
      const mockReq: any = { query: { page: "1", limit: "2" } };

      (Review.countDocuments as jest.Mock).mockResolvedValue(2);

      // ✅ handle chained .populate()
      const mockPopulateVehicle = jest.fn().mockResolvedValue([
        { _id: "rev1", comment: "Nice" },
        { _id: "rev2", comment: "Good" },
      ]);

      const mockPopulateUser = jest.fn().mockReturnValue({
        populate: mockPopulateVehicle,
      });

      (Review.find as jest.Mock).mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: mockPopulateUser,
      });

      const result = await handleGetAllReviews(mockReq);

      expect(Review.find).toHaveBeenCalled();
      expect(result.pagination.total).toBe(2);
      expect(result.reviews).toHaveLength(2);
      expect(result.reviews[0]).toEqual({ _id: "rev1", comment: "Nice" });
    });
  });
});
