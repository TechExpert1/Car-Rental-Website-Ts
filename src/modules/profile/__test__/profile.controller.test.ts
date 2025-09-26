import { updateProfile, getProfile, getBookings } from "../profile.controller";
import * as profileService from "../profile.service";

describe("Profile Controller", () => {
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    mockReq = { params: {}, body: {}, query: {}, user: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe("updateProfile", () => {
    it("should return 201 on success", async () => {
      jest.spyOn(profileService, "handleUpdateProfile").mockResolvedValue({
        message: "ok",
        user: { _id: "u1", name: "Test User", email: "test@test.com" } as any,
      });

      await updateProfile(mockReq, mockRes);

      expect(profileService.handleUpdateProfile).toHaveBeenCalledWith(mockReq);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "ok",
        user: { _id: "u1", name: "Test User", email: "test@test.com" },
      });
    });

    it("should return 422 on error", async () => {
      jest
        .spyOn(profileService, "handleUpdateProfile")
        .mockRejectedValue(new Error("fail"));

      await updateProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "fail" });
    });
  });

  describe("getProfile", () => {
    it("should return 200 on success", async () => {
      jest.spyOn(profileService, "handleGetProfile").mockResolvedValue({
        user: { _id: "u1", name: "Test User", email: "test@test.com" } as any,
      });

      await getProfile(mockReq, mockRes);

      expect(profileService.handleGetProfile).toHaveBeenCalledWith(mockReq);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        user: { _id: "u1", name: "Test User", email: "test@test.com" },
      });
    });

    it("should return 422 on error", async () => {
      jest
        .spyOn(profileService, "handleGetProfile")
        .mockRejectedValue(new Error("fail"));

      await getProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "fail" });
    });
  });

  describe("getBookings", () => {
    it("should return 200 on success", async () => {
      jest.spyOn(profileService, "handleGetBookings").mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      await getBookings(mockReq, mockRes);

      expect(profileService.handleGetBookings).toHaveBeenCalledWith(mockReq);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });
    });

    it("should return 422 on error", async () => {
      jest
        .spyOn(profileService, "handleGetBookings")
        .mockRejectedValue(new Error("fail"));

      await getBookings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "fail" });
    });
  });
});
