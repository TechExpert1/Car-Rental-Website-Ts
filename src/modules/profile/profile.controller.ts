import { Request, Response } from "express";
import {
  handleUpdateProfile,
  handleGetProfile,
  handleGetBookings,
} from "./profile.service";

export const updateProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await handleUpdateProfile(req);
    res.status(201).json(result);
  } catch (err: any) {
    console.log("updateProfile error:", err);
    res.status(422).json({ error: err.message });
  }
};

export const getProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await handleGetProfile(req);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(422).json({ error: err.message });
  }
};

export const getBookings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await handleGetBookings(req);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(422).json({ error: err.message });
  }
};
