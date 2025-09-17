import { Request, Response } from "express";
import { handleUpdateBooking, handleGetAllBooking } from "./booking.service";

export const updateBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await handleUpdateBooking(req);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(422).json({ error: err.message });
  }
};

export const getAllBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await handleGetAllBooking(req);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(422).json({ error: err.message });
  }
};
