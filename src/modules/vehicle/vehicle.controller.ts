import { Request, Response } from "express";
import {
  handleCreateVehicle,
  handleGetAllVehicles,
  handleGetVehicleById,
  handleUpdateVehicle,
  handleDeleteVehicle,
  handleVehicleReviews,
  handleDeactivateVehicle,
  handleActivateVehicle,
} from "./vehicle.service";

export const createVehicle = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await handleCreateVehicle(req);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(422).json({ error: err.message });
  }
};

export const getAllVehicles = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await handleGetAllVehicles(req);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(422).json({ error: err.message });
  }
};

export const getVehicleById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await handleGetVehicleById(req);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
};

export const getVehicleReviews = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await handleVehicleReviews(req);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
};

export const updateVehicle = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await handleUpdateVehicle(req);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(422).json({ error: err.message });
  }
};

export const deleteVehicle = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await handleDeleteVehicle(req);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(422).json({ error: err.message });
  }
};

export const deactivateVehicle = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await handleDeactivateVehicle(req);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(422).json({ error: err.message });
  }
};

export const activateVehicle = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await handleActivateVehicle(req);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(422).json({ error: err.message });
  }
};
