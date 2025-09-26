import Booking from "../booking.model";
import {
  handleUpdateBooking,
  handleCancelBooking,
  handleGetAllBooking,
  handleUserBookingStats,
  handleUserMonthlyRevenue,
} from "../booking.service";

import { refundPayment } from "../../../utils/booking";

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

jest.mock("../booking.model");
jest.mock("../../../utils/booking");

describe("Booking Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("handleUpdateBooking", () => {
    it("should update booking", async () => {
      const mockReq: any = { params: { id: "b1" }, body: { status: "done" } };

      (Booking.findByIdAndUpdate as jest.Mock).mockResolvedValue({
        _id: "b1",
        status: "done",
      });

      const result = await handleUpdateBooking(mockReq);
      expect(result.message).toBe("Booking updated successfully");
    });

    it("should throw error if not found", async () => {
      const mockReq: any = { params: { id: "b999" }, body: {} };
      (Booking.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      await expect(handleUpdateBooking(mockReq)).rejects.toThrow(
        "Booking not found"
      );
    });
  });

  describe("handleCancelBooking", () => {
    it("should cancel booking", async () => {
      const mockReq: any = { params: { id: "b1" } };

      (Booking.findById as jest.Mock).mockResolvedValue({
        _id: "b1",
        paymentIntentId: "pi_123",
      });
      (refundPayment as jest.Mock).mockResolvedValue(true);
      (Booking.findByIdAndUpdate as jest.Mock).mockResolvedValue({
        _id: "b1",
        bookingStatus: "canceled",
      });

      const result = await handleCancelBooking(mockReq);
      expect(result.message).toBe("Booking cancelled successfully");
    });

    it("should throw error if booking not found", async () => {
      const mockReq: any = { params: { id: "b999" } };
      (Booking.findById as jest.Mock).mockResolvedValue(null);

      await expect(handleCancelBooking(mockReq)).rejects.toThrow(
        "Booking not found"
      );
    });

    it("should throw error if paymentIntentId missing", async () => {
      const mockReq: any = { params: { id: "b1" } };
      (Booking.findById as jest.Mock).mockResolvedValue({
        _id: "b1",
      });

      await expect(handleCancelBooking(mockReq)).rejects.toThrow(
        "Payment intent id is missing from booking"
      );
    });
  });

  describe("handleGetAllBooking", () => {
    it("should return paginated bookings", async () => {
      const mockReq: any = { query: { page: "1", limit: "2" } };

      (Booking.countDocuments as jest.Mock).mockResolvedValue(2);
      (Booking.find as jest.Mock).mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      });

      const result = await handleGetAllBooking(mockReq);

      expect(Booking.find).toHaveBeenCalled();
      expect(result.pagination.total).toBe(2);
    });
  });

  describe("handleUserBookingStats", () => {
    it("should throw error if user not authenticated", async () => {
      const mockReq: any = {};
      await expect(handleUserBookingStats(mockReq)).rejects.toThrow(
        "User not authenticated"
      );
    });
  });

  describe("handleUserMonthlyRevenue", () => {
    it("should throw error if user not authenticated", async () => {
      const mockReq: any = {};
      await expect(handleUserMonthlyRevenue(mockReq)).rejects.toThrow(
        "User not authenticated"
      );
    });
  });
});
