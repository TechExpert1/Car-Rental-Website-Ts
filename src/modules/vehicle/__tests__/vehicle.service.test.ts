import Vehicle from "../vehicle.model";
import Review from "../../review/review.model";
import {
  handleCreateVehicle,
  handleGetAllVehicles,
  handleGetVehicleById,
  handleUpdateVehicle,
  handleVehicleReviews,
  handleDeleteVehicle,
} from "../vehicle.service";
jest.mock("../vehicle.model");
jest.mock("../../review/review.model");
describe("Vehicle Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("handleCreateVehicle", () => {
    it("should create a vehicle successfully", async () => {
      const mockReq: any = {
        user: { id: "user123" },
        body: { name: "Car A", rent: 100 },
      };

      (Vehicle.create as jest.Mock).mockResolvedValue({
        _id: "veh123",
        name: "Car A",
        rent: 100,
      });

      const result = await handleCreateVehicle(mockReq);

      expect(Vehicle.create).toHaveBeenCalledWith({
        host: "user123",
        name: "Car A",
        rent: 100,
      });
      expect(result).toEqual({
        message: "Vehicle created successfully",
        vehicle: { _id: "veh123", name: "Car A", rent: 100 },
      });
    });

    it("should throw error if user id missing", async () => {
      const mockReq: any = { user: {}, body: { name: "Car A" } };

      await expect(handleCreateVehicle(mockReq)).rejects.toThrow(
        "Need a user Id - req.user.id is missing"
      );
    });
  });

  describe("handleGetAllVehicles", () => {
    it("should return paginated vehicles", async () => {
      const mockReq: any = { query: { page: "1", limit: "2" } };

      (Vehicle.countDocuments as jest.Mock).mockResolvedValue(2);
      (Vehicle.find as jest.Mock).mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ _id: "veh1" }, { _id: "veh2" }]),
      });

      const result = await handleGetAllVehicles(mockReq);

      expect(result.pagination.total).toBe(2);
      expect(result.vehicles).toHaveLength(2);
    });
  });

  describe("handleGetVehicleById", () => {
    it("should return a vehicle by ID", async () => {
      const mockReq: any = { params: { id: "veh123" } };
      (Vehicle.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue({ _id: "veh123", name: "Car A" }),
      });

      const result = await handleGetVehicleById(mockReq);

      expect(result).toEqual({ vehicle: { _id: "veh123", name: "Car A" } });
    });

    it("should throw error if vehicle not found", async () => {
      const mockReq: any = { params: { id: "veh999" } };
      (Vehicle.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await expect(handleGetVehicleById(mockReq)).rejects.toThrow(
        "Vehicle not found"
      );
    });
  });

  describe("handleUpdateVehicle", () => {
    it("should update a vehicle", async () => {
      const mockReq: any = {
        user: { id: "user123" },
        params: { id: "veh123" },
        body: { name: "Updated Car" },
      };

      (Vehicle.findByIdAndUpdate as jest.Mock).mockResolvedValue({
        _id: "veh123",
        name: "Updated Car",
      });

      const result = await handleUpdateVehicle(mockReq);

      expect(result).toEqual({
        message: "Vehicle updated successfully",
        vehicle: { _id: "veh123", name: "Updated Car" },
      });
    });
  });

  describe("handleDeleteVehicle", () => {
    it("should delete a vehicle", async () => {
      const mockReq: any = { params: { id: "veh123" } };
      (Vehicle.findByIdAndDelete as jest.Mock).mockResolvedValue({
        _id: "veh123",
      });

      const result = await handleDeleteVehicle(mockReq);

      expect(result).toEqual({ message: "Vehicle deleted successfully" });
    });

    it("should throw error if vehicle not found", async () => {
      const mockReq: any = { params: { id: "veh999" } };
      (Vehicle.findByIdAndDelete as jest.Mock).mockResolvedValue(null);

      await expect(handleDeleteVehicle(mockReq)).rejects.toThrow(
        "Vehicle not found"
      );
    });
  });

  describe("handleVehicleReviews", () => {
    it("should return reviews for a vehicle", async () => {
      const mockReq: any = { params: { id: "veh123" } };
      (Review.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue([{ review: "Great!" }]),
      });

      const result = await handleVehicleReviews(mockReq);

      expect(result).toEqual({ reviews: [{ review: "Great!" }] });
    });
  });
});
