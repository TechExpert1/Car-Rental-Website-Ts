// src/modules/review/__tests__/review.controller.test.ts
import { Request, Response } from "express";
import {
  createReview,
  updateReview,
  deleteReview,
  getById,
  getAllReviews,
} from "../review.controller";

import * as reviewService from "../review.service";

// Mock service functions
jest.mock("../review.service");

describe("Review Controller", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe("createReview", () => {
    it("should create a review successfully", async () => {
      (reviewService.handleCreateReview as jest.Mock).mockResolvedValue({
        message: "Review created successfully",
      });

      await createReview(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Review created successfully",
      });
    });

    it("should return 422 if service throws error", async () => {
      (reviewService.handleCreateReview as jest.Mock).mockRejectedValue(
        new Error("Invalid review")
      );

      await createReview(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Invalid review" });
    });
  });

  describe("updateReview", () => {
    it("should update a review", async () => {
      (reviewService.handleUpdateReview as jest.Mock).mockResolvedValue({
        message: "Review updated successfully",
      });

      await updateReview(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Review updated successfully",
      });
    });

    it("should return 422 if service throws error", async () => {
      (reviewService.handleUpdateReview as jest.Mock).mockRejectedValue(
        new Error("Update failed")
      );

      await updateReview(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Update failed" });
    });
  });

  describe("deleteReview", () => {
    it("should delete a review", async () => {
      (reviewService.handleDeleteReview as jest.Mock).mockResolvedValue({
        message: "Review deleted successfully",
      });

      await deleteReview(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Review deleted successfully",
      });
    });

    it("should return 422 if service throws error", async () => {
      (reviewService.handleDeleteReview as jest.Mock).mockRejectedValue(
        new Error("Delete failed")
      );

      await deleteReview(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Delete failed" });
    });
  });

  describe("getById", () => {
    it("should return a review by id", async () => {
      (reviewService.handleGetByIdReview as jest.Mock).mockResolvedValue({
        id: 1,
        review: "Great car",
      });

      await getById(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ id: 1, review: "Great car" });
    });

    it("should return 422 if review not found", async () => {
      (reviewService.handleGetByIdReview as jest.Mock).mockRejectedValue(
        new Error("Review not found")
      );

      await getById(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Review not found" });
    });
  });

  describe("getAllReviews", () => {
    it("should return all reviews", async () => {
      (reviewService.handleGetAllReviews as jest.Mock).mockResolvedValue([
        { id: 1, review: "Great car" },
      ]);

      await getAllReviews(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith([
        { id: 1, review: "Great car" },
      ]);
    });

    it("should return 422 if service throws error", async () => {
      (reviewService.handleGetAllReviews as jest.Mock).mockRejectedValue(
        new Error("Error fetching reviews")
      );

      await getAllReviews(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Error fetching reviews",
      });
    });
  });
});
