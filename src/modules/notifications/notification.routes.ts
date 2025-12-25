import express from "express";
import { userAuth } from "../../middlewares";
import { getNotifications, markAsRead, markAllAsRead, clearAll } from "./notification.controller";

const router = express.Router();

// GET /notifications?unread=true&page=1&limit=20
router.get("/", userAuth, getNotifications);
// POST /notifications/mark-read { id }
router.post("/mark-read", userAuth, markAsRead);
// POST /notifications/mark-all-read
router.post("/mark-all-read", userAuth, markAllAsRead);
// DELETE /notifications (clear all)
router.delete("/", userAuth, clearAll);

export default router;
