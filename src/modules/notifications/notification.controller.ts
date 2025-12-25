import { Request, Response } from "express";
import {
  handleGetNotifications,
  handleMarkAsRead,
  handleMarkAllAsRead,
  handleClearAll,
  createNotification,
} from "./notification.service";
import AuthRequest from "../../middlewares/userAuth";

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const result = await handleGetNotifications(req);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(422).json({ error: err.message });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const result = await handleMarkAsRead(req);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(422).json({ error: err.message });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const result = await handleMarkAllAsRead(req);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(422).json({ error: err.message });
  }
};

export const clearAll = async (req: AuthRequest, res: Response) => {
  try {
    const result = await handleClearAll(req);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(422).json({ error: err.message });
  }
};

// Export helper to create notifications programmatically elsewhere
export { createNotification };
