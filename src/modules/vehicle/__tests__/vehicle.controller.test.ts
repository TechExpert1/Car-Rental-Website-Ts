// src/modules/vehicle/__tests__/vehicle.controller.test.ts
import { Request, Response } from "express";
import {
  createVehicle,
  getAllVehicles,
  getVehicleById,
  getVehicleReviews,
  updateVehicle,
  deleteVehicle,
} from "../vehicle.controller";

import * as vehicleService from "../vehicle.service";

// Mock service functions
jest.mock("../vehicle.service");

describe("Vehicle Controller", () => {
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

  describe("createVehicle", () => {
    it("should create a vehicle successfully", async () => {
      (vehicleService.handleCreateVehicle as jest.Mock).mockResolvedValue({
        message: "Vehicle created",
      });

      await createVehicle(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Vehicle created" });
    });

    it("should return 422 if service throws error", async () => {
      (vehicleService.handleCreateVehicle as jest.Mock).mockRejectedValue(
        new Error("Invalid")
      );

      await createVehicle(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Invalid" });
    });
  });

  describe("getAllVehicles", () => {
    it("should return all vehicles", async () => {
      (vehicleService.handleGetAllVehicles as jest.Mock).mockResolvedValue([
        { id: 1, name: "Car A" },
      ]);

      await getAllVehicles(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith([{ id: 1, name: "Car A" }]);
    });

    it("should return 422 if service throws error", async () => {
      (vehicleService.handleGetAllVehicles as jest.Mock).mockRejectedValue(
        new Error("Error fetching vehicles")
      );

      await getAllVehicles(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Error fetching vehicles",
      });
    });
  });

  describe("getVehicleById", () => {
    it("should return a vehicle by id", async () => {
      (vehicleService.handleGetVehicleById as jest.Mock).mockResolvedValue({
        id: 1,
        name: "Car A",
      });

      await getVehicleById(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ id: 1, name: "Car A" });
    });

    it("should return 404 if vehicle not found", async () => {
      (vehicleService.handleGetVehicleById as jest.Mock).mockRejectedValue(
        new Error("Not found")
      );

      await getVehicleById(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Not found" });
    });
  });

  describe("getVehicleReviews", () => {
    it("should return reviews for a vehicle", async () => {
      (vehicleService.handleVehicleReviews as jest.Mock).mockResolvedValue([
        { id: 1, review: "Great car" },
      ]);

      await getVehicleReviews(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith([
        { id: 1, review: "Great car" },
      ]);
    });

    it("should return 404 if reviews not found", async () => {
      (vehicleService.handleVehicleReviews as jest.Mock).mockRejectedValue(
        new Error("Not found")
      );

      await getVehicleReviews(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Not found" });
    });
  });

  describe("updateVehicle", () => {
    it("should update a vehicle", async () => {
      (vehicleService.handleUpdateVehicle as jest.Mock).mockResolvedValue({
        message: "Vehicle updated",
      });

      await updateVehicle(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Vehicle updated" });
    });

    it("should return 422 if service throws error", async () => {
      (vehicleService.handleUpdateVehicle as jest.Mock).mockRejectedValue(
        new Error("Update failed")
      );

      await updateVehicle(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Update failed" });
    });
  });

  describe("deleteVehicle", () => {
    it("should delete a vehicle", async () => {
      (vehicleService.handleDeleteVehicle as jest.Mock).mockResolvedValue({
        message: "Vehicle deleted",
      });

      await deleteVehicle(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Vehicle deleted" });
    });

    it("should return 422 if service throws error", async () => {
      (vehicleService.handleDeleteVehicle as jest.Mock).mockRejectedValue(
        new Error("Delete failed")
      );

      await deleteVehicle(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Delete failed" });
    });
  });
});
