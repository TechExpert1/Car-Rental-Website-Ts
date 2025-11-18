import { Response } from "express";
import AuthRequest from "../../middlewares/userAuth";
import { createDispute, getAllDisputes } from "../../services/dispute.service";

/**
 * Create a new dispute
 */
export const createNewDispute = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { bookingId, disputeType, description, evidence } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!bookingId || !disputeType || !description) {
      res.status(400).json({
        error: "bookingId, disputeType, and description are required",
      });
      return;
    }

    const result = await createDispute(
      bookingId,
      userId,
      disputeType,
      description,
      evidence || []
    );

    res.status(201).json(result);
  } catch (error: any) {
    console.error("Create dispute error:", error.message);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get user's disputes
 */
export const getUserDisputes = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { status } = req.query;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Get disputes where user is either reporter or reported against
    const disputes = await getAllDisputes(status as string);

    // Filter disputes for this user
    const userDisputes = disputes.filter(
      (dispute: any) =>
        dispute.reportedBy._id.toString() === userId ||
        dispute.reportedAgainst._id.toString() === userId
    );

    res.status(200).json({ success: true, disputes: userDisputes });
  } catch (error: any) {
    console.error("Get user disputes error:", error.message);
    res.status(400).json({ error: error.message });
  }
};
