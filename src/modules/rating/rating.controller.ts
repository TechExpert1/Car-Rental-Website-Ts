import { Response } from "express";
import AuthRequest from "../../middlewares/userAuth";
import {
  createHostToGuestRating,
  createGuestToHostRating,
  getUserRatings,
  getBookingRatings,
} from "../../services/rating.service";

/**
 * Create rating from host to guest
 */
export const rateGuest = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { bookingId, guestRatings, comment } = req.body;
    const hostId = req.user?.id;

    if (!hostId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!bookingId || !guestRatings) {
      res.status(400).json({
        error: "bookingId and guestRatings are required",
      });
      return;
    }

    // Validate ratings
    const { cleanliness, communication, punctuality, ruleCompliance } =
      guestRatings;
    if (
      !cleanliness ||
      !communication ||
      !punctuality ||
      !ruleCompliance ||
      cleanliness < 1 ||
      cleanliness > 5 ||
      communication < 1 ||
      communication > 5 ||
      punctuality < 1 ||
      punctuality > 5 ||
      ruleCompliance < 1 ||
      ruleCompliance > 5
    ) {
      res.status(400).json({
        error: "All ratings must be between 1 and 5",
      });
      return;
    }

    const result = await createHostToGuestRating(
      bookingId,
      hostId,
      guestRatings,
      comment
    );

    res.status(201).json(result);
  } catch (error: any) {
    console.error("Rate guest error:", error.message);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Create rating from guest to host
 */
export const rateHost = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { bookingId, hostRatings, comment } = req.body;
    const guestId = req.user?.id;

    if (!guestId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!bookingId || !hostRatings) {
      res.status(400).json({
        error: "bookingId and hostRatings are required",
      });
      return;
    }

    // Validate ratings
    const { carCondition, pickupDropoff, communication } = hostRatings;
    if (
      !carCondition ||
      !pickupDropoff ||
      !communication ||
      carCondition < 1 ||
      carCondition > 5 ||
      pickupDropoff < 1 ||
      pickupDropoff > 5 ||
      communication < 1 ||
      communication > 5
    ) {
      res.status(400).json({
        error: "All ratings must be between 1 and 5",
      });
      return;
    }

    const result = await createGuestToHostRating(
      bookingId,
      guestId,
      hostRatings,
      comment
    );

    res.status(201).json(result);
  } catch (error: any) {
    console.error("Rate host error:", error.message);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get user's ratings
 */
export const getMyRatings = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { ratingType, limit } = req.query;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const ratings = await getUserRatings(
      userId,
      ratingType as any,
      limit ? parseInt(limit as string) : 50
    );

    res.status(200).json({ success: true, ratings });
  } catch (error: any) {
    console.error("Get my ratings error:", error.message);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get ratings for a specific booking
 */
export const getRatingsForBooking = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { bookingId } = req.params;

    const ratings = await getBookingRatings(bookingId);

    res.status(200).json({ success: true, ratings });
  } catch (error: any) {
    console.error("Get booking ratings error:", error.message);
    res.status(400).json({ error: error.message });
  }
};
