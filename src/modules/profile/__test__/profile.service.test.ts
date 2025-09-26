import bcrypt from "bcryptjs";
import User from "../../auth/auth.model";
import Booking from "../../booking/booking.model";
import {
  handleUpdateProfile,
  handleGetProfile,
  handleGetBookings,
} from "../profile.service";

// Mock dependencies
jest.mock("bcryptjs");
jest.mock("../../auth/auth.model");
jest.mock("../../booking/booking.model");

describe("Profile Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("handleUpdateProfile", () => {
    it("should update user profile successfully", async () => {
      const mockUser = {
        _id: "user123",
        password: "hashedPass",
        save: jest.fn(),
      };
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue("newHashed");

      const req: any = {
        params: { id: "user123" },
        body: {
          currentPassword: "oldPass",
          newPassword: "newPass",
          name: "John",
        },
        user: { id: "user123" },
      };

      const result = await handleUpdateProfile(req);

      expect(User.findById).toHaveBeenCalledWith("user123");
      expect(bcrypt.compare).toHaveBeenCalledWith("oldPass", "hashedPass");
      expect(bcrypt.hash).toHaveBeenCalledWith("newPass", 10);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result.message).toBe("User updated successfully");
    });

    it("should throw error if user not found", async () => {
      (User.findById as jest.Mock).mockResolvedValue(null);

      const req: any = {
        params: { id: "user123" },
        body: {},
        user: { id: "user123" },
      };

      await expect(handleUpdateProfile(req)).rejects.toThrow("User not found");
    });

    it("should throw error if unauthorized user tries to update", async () => {
      const mockUser = { _id: "user123" };
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      const req: any = {
        params: { id: "user123" },
        body: {},
        user: { id: "otherUser" },
      };

      await expect(handleUpdateProfile(req)).rejects.toThrow(
        "Unauthorized to update this profile"
      );
    });
  });

  describe("handleGetProfile", () => {
    it("should return user profile", async () => {
      const mockUser = { _id: "user123", name: "John" };
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      const req: any = { params: { id: "user123" } };
      const result = await handleGetProfile(req);

      expect(User.findById).toHaveBeenCalledWith("user123");
      expect(result.user).toEqual(mockUser);
    });

    it("should throw error if user not found", async () => {
      (User.findById as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: "user123" } };

      await expect(handleGetProfile(req)).rejects.toThrow("User not found");
    });
  });

  describe("handleGetBookings", () => {
    it("should return bookings for user with pagination", async () => {
      (Booking.countDocuments as jest.Mock).mockResolvedValue(2);
      (Booking.find as jest.Mock).mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([{ id: "b1" }, { id: "b2" }]),
      });

      const req: any = {
        params: { id: "user123" },
        query: { role: "customer", page: "1", limit: "10" },
      };

      const result = await handleGetBookings(req);

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });
  });
});
