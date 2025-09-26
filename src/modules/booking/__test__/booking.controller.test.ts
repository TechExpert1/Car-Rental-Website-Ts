import { Request, Response } from "express";
import {
  updateBooking,
  cancelBooking,
  getAllBooking,
  getUserBookingStats,
  getUserYearlyStats,
} from "../booking.controller";

import * as bookingService from "../booking.service";

// 👇 Stripe mock (important!)
jest.mock("../../../config/stripe", () => ({
  stripe: {
    paymentIntents: {
      create: jest.fn(),
      cancel: jest.fn(),
    },
    refunds: {
      create: jest.fn(),
    },
  },
}));

jest.mock("../booking.service");

describe("Booking Controller", () => {
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

  describe("updateBooking", () => {
    it("should update booking successfully", async () => {
      (bookingService.handleUpdateBooking as jest.Mock).mockResolvedValue({
        message: "Booking updated successfully",
      });

      await updateBooking(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Booking updated successfully",
      });
    });

    it("should return 422 if service throws error", async () => {
      (bookingService.handleUpdateBooking as jest.Mock).mockRejectedValue(
        new Error("Update failed")
      );

      await updateBooking(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Update failed" });
    });
  });

  describe("cancelBooking", () => {
    it("should cancel booking successfully", async () => {
      (bookingService.handleCancelBooking as jest.Mock).mockResolvedValue({
        message: "Booking cancelled successfully",
      });

      await cancelBooking(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Booking cancelled successfully",
      });
    });

    it("should return 422 if service throws error", async () => {
      (bookingService.handleCancelBooking as jest.Mock).mockRejectedValue(
        new Error("Cancel failed")
      );

      await cancelBooking(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Cancel failed" });
    });
  });

  describe("getAllBooking", () => {
    it("should return all bookings", async () => {
      (bookingService.handleGetAllBooking as jest.Mock).mockResolvedValue({
        bookings: [{ id: 1, status: "active" }],
      });

      await getAllBooking(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        bookings: [{ id: 1, status: "active" }],
      });
    });

    it("should return 422 if service throws error", async () => {
      (bookingService.handleGetAllBooking as jest.Mock).mockRejectedValue(
        new Error("Error fetching bookings")
      );

      await getAllBooking(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Error fetching bookings",
      });
    });
  });

  describe("getUserBookingStats", () => {
    it("should return user stats", async () => {
      (bookingService.handleUserBookingStats as jest.Mock).mockResolvedValue({
        totalRevenue: 1000,
      });

      await getUserBookingStats(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ totalRevenue: 1000 });
    });

    it("should return 422 if service throws error", async () => {
      (bookingService.handleUserBookingStats as jest.Mock).mockRejectedValue(
        new Error("Stats error")
      );

      await getUserBookingStats(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Stats error" });
    });
  });

  describe("getUserYearlyStats", () => {
    it("should return yearly stats", async () => {
      (bookingService.handleUserMonthlyRevenue as jest.Mock).mockResolvedValue({
        monthlyRevenue: [100, 200],
        year: 2025,
      });

      await getUserYearlyStats(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        monthlyRevenue: [100, 200],
        year: 2025,
      });
    });

    it("should return 422 if service throws error", async () => {
      (bookingService.handleUserMonthlyRevenue as jest.Mock).mockRejectedValue(
        new Error("Yearly stats error")
      );

      await getUserYearlyStats(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Yearly stats error",
      });
    });
  });
});
