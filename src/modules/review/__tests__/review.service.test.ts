// src/modules/review/__tests__/review.service.test.ts
import Review from "../review.model";
import Vehicle from "../../vehicle/vehicle.model";
import {
  handleCreateReview,
  handleUpdateReview,
  handleDeleteReview,
  handleGetByIdReview,
  handleGetAllReviews,
} from "../review.service";

jest.mock("../review.model");
jest.mock("../../vehicle/vehicle.model");

describe("Review Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("handleCreateReview", () => {
    it("should create a review successfully", async () => {
      const mockReq: any = {
        user: { id: 'user123', name: 'User One', email: 'user@example.com' },
        body: {
          vehicle: 'veh1',
          text: 'Great ride',
          name: 'User One',
          conditionAccuracy: '4',
          pickupEase: '3',
          communication: 4,
        },
        fileUrls: { media: ['https://bucket/uploads/img1.jpg'] },
      };

      (Review.create as jest.Mock).mockResolvedValue({
        _id: "rev123",
        vehicle: 'veh1',
        text: 'Great ride',
      });

      // Mock Vehicle.findById to return a host
      (Vehicle.findById as jest.Mock).mockResolvedValue({ host: 'host123', name: 'Car A' });

      // Mock createNotification to be a no-op
      jest.mock('../notifications/notification.service', () => ({ createNotification: jest.fn() }));

      const result = await handleCreateReview(mockReq);

      expect(Review.create).toHaveBeenCalledWith(expect.objectContaining({
        user: 'user123',
        vehicle: 'veh1',
        text: 'Great ride',
        name: 'User One',
        email: 'user@example.com',
        media: ['https://bucket/uploads/img1.jpg'],
        conditionAccuracy: 4,
        pickupEase: 3,
        communication: 4,
        rating: 3.67,
      }));
      expect(result).toEqual({
        message: "Review created successfully",
        review: { _id: "rev123", vehicle: 'veh1', text: 'Great ride' },
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
        { _id: "rev1", comment: "Nice", user: { name: 'User A', image: 'https://img' } },
        { _id: "rev2", comment: "Good", user: { name: 'User B', image: 'https://img2' } },
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
      expect(result.reviews[0].user).toEqual({ name: 'User A', image: 'https://img' });
    });

    it("should filter reviews by vehicle id", async () => {
      const mockReq: any = { query: { vehicle: 'veh1', page: '1', limit: '10' } };

      (Review.countDocuments as jest.Mock).mockResolvedValue(1);

      (Review.find as jest.Mock).mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([{ _id: 'rev1', vehicle: 'veh1' }]),
      });

      const result = await handleGetAllReviews(mockReq);

      expect(Review.find).toHaveBeenCalled();
      expect(result.reviews[0]).toEqual({ _id: 'rev1', vehicle: 'veh1' });
    });

    it("should return authenticated user's reviews (customer)", async () => {
      const mockReq: any = { query: { mine: 'true', page: '1', limit: '10' }, user: { id: 'user123', role: 'customer' } };

      (Review.countDocuments as jest.Mock).mockResolvedValue(1);

      (Review.find as jest.Mock).mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([{ _id: 'rev2', user: 'user123' }]),
      });

      const result = await handleGetAllReviews(mockReq);

      expect(Review.find).toHaveBeenCalled();
      expect(result.reviews[0]).toEqual({ _id: 'rev2', user: 'user123' });
    });

    it("should return host's vehicle reviews when authenticated as host", async () => {
      const mockReq: any = { query: { mine: 'true', page: '1', limit: '10' }, user: { id: 'host123', role: 'host' } };

      // Mock Vehicle.find to return vehicle list
      (Vehicle.find as jest.Mock).mockResolvedValue([{ _id: 'v1' }]);

      (Review.countDocuments as jest.Mock).mockResolvedValue(1);
      (Review.find as jest.Mock).mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([{ _id: 'rev3', vehicle: 'v1' }]),
      });

      const result = await handleGetAllReviews(mockReq);

      expect(Review.find).toHaveBeenCalled();
      expect(result.reviews[0]).toEqual({ _id: 'rev3', vehicle: 'v1' });
    });
  });
});
