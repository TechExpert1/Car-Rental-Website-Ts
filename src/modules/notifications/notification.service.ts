import { Request } from "express";
import Notification, { INotification } from "./notification.model";
import AuthRequest from "../../middlewares/userAuth";
import mongoose from "mongoose";

export const createNotification = async (
  userId: string,
  type: string,
  title: string,
  message: string,
  data?: Record<string, any>
) => {
  const notification = await Notification.create({
    user: new mongoose.Types.ObjectId(userId),
    type,
    title,
    message,
    data,
  });
  return notification;
};

export const handleGetNotifications = async (req: AuthRequest) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new Error("Unauthorized");

    let { page = 1, limit = 20, unread } = req.query as any;
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);

    const query: Record<string, any> = { user: new mongoose.Types.ObjectId(userId) };
    if (unread === 'true') query.read = false;

    const total = await Notification.countDocuments(query);
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .lean();

    return {
      notifications,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    };
  } catch (err) {
    console.error("Get notifications error:", err);
    throw err;
  }
};

export const handleMarkAsRead = async (req: AuthRequest) => {
  try {
    const userId = req.user?.id;
    const { id } = req.body;
    if (!userId) throw new Error("Unauthorized");
    if (!id) throw new Error("Notification id is required");

    const notif = await Notification.findOneAndUpdate(
      { _id: id, user: new mongoose.Types.ObjectId(userId) },
      { read: true },
      { new: true }
    );

    if (!notif) throw new Error("Notification not found");
    return { message: "Marked as read", notification: notif };
  } catch (err) {
    console.error("Mark as read error:", err);
    throw err;
  }
};

export const handleMarkAllAsRead = async (req: AuthRequest) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new Error("Unauthorized");

    await Notification.updateMany({ user: new mongoose.Types.ObjectId(userId), read: false }, { read: true });
    return { message: "All notifications marked as read" };
  } catch (err) {
    console.error("Mark all read error:", err);
    throw err;
  }
};

export const handleClearAll = async (req: AuthRequest) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new Error("Unauthorized");

    await Notification.deleteMany({ user: new mongoose.Types.ObjectId(userId) });
    return { message: "All notifications cleared" };
  } catch (err) {
    console.error("Clear notifications error:", err);
    throw err;
  }
};
