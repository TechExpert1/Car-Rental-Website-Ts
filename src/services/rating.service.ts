import Rating from "../modules/rating/rating.model";
import Booking from "../modules/booking/booking.model";
import User from "../modules/auth/auth.model";
import mongoose from "mongoose";

interface GuestRatings {
  cleanliness: number;
  communication: number;
  punctuality: number;
  ruleCompliance: number;
}

interface HostRatings {
  carCondition: number;
  pickupDropoff: number;
  communication: number;
}

/**
 * Create a rating from host to guest
 */
export const createHostToGuestRating = async (
  bookingId: string,
  hostId: string,
  guestRatings: GuestRatings,
  comment?: string
): Promise<any> => {
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.bookingStatus !== "completed") {
    throw new Error("Can only rate completed bookings");
  }

  if (!booking.host.equals(new mongoose.Types.ObjectId(hostId))) {
    throw new Error("Only the host can rate the guest");
  }

  // Check if rating already exists
  const existingRating = await Rating.findOne({
    booking: bookingId,
    ratedBy: hostId,
  });

  if (existingRating) {
    throw new Error("You have already rated this guest");
  }

  // Calculate overall rating
  const overallRating =
    (guestRatings.cleanliness +
      guestRatings.communication +
      guestRatings.punctuality +
      guestRatings.ruleCompliance) /
    4;

  // Create rating
  const rating = await Rating.create({
    booking: bookingId,
    ratedBy: hostId,
    ratedUser: booking.user,
    ratingType: "host_to_guest",
    guestRatings,
    overallRating,
    comment,
  });

  // Update guest's average rating
  await updateUserAverageRating(booking.user.toString(), "guest");

  return {
    success: true,
    message: "Guest rated successfully",
    rating: {
      id: rating._id,
      overallRating: rating.overallRating,
      guestRatings: rating.guestRatings,
    },
  };
};

/**
 * Create a rating from guest to host
 */
export const createGuestToHostRating = async (
  bookingId: string,
  guestId: string,
  hostRatings: HostRatings,
  comment?: string
): Promise<any> => {
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.bookingStatus !== "completed") {
    throw new Error("Can only rate completed bookings");
  }

  if (!booking.user.equals(new mongoose.Types.ObjectId(guestId))) {
    throw new Error("Only the guest can rate the host");
  }

  // Check if rating already exists
  const existingRating = await Rating.findOne({
    booking: bookingId,
    ratedBy: guestId,
  });

  if (existingRating) {
    throw new Error("You have already rated this host");
  }

  // Calculate overall rating
  const overallRating =
    (hostRatings.carCondition +
      hostRatings.pickupDropoff +
      hostRatings.communication) /
    3;

  // Create rating
  const rating = await Rating.create({
    booking: bookingId,
    ratedBy: guestId,
    ratedUser: booking.host,
    ratingType: "guest_to_host",
    hostRatings,
    overallRating,
    comment,
  });

  // Update host's average rating
  await updateUserAverageRating(booking.host.toString(), "host");

  // Check if host qualifies for verified status
  await checkHostVerification(booking.host.toString());

  return {
    success: true,
    message: "Host rated successfully",
    rating: {
      id: rating._id,
      overallRating: rating.overallRating,
      hostRatings: rating.hostRatings,
    },
  };
};

/**
 * Update user's average rating
 */
const updateUserAverageRating = async (
  userId: string,
  userType: "host" | "guest"
): Promise<void> => {
  const user = await User.findById(userId);

  if (!user) {
    return;
  }

  // Calculate average rating
  const ratingField = userType === "host" ? "guest_to_host" : "host_to_guest";
  const ratings = await Rating.find({
    ratedUser: userId,
    ratingType: ratingField,
  });

  const totalRatings = ratings.length;
  const sumRatings = ratings.reduce((sum, r) => sum + r.overallRating, 0);
  const averageRating = totalRatings > 0 ? sumRatings / totalRatings : 0;

  if (userType === "host") {
    user.averageRating = averageRating;
    user.totalRatings = totalRatings;
  } else {
    user.averageGuestRating = averageRating;
    user.totalGuestRatings = totalRatings;
  }

  await user.save();
};

/**
 * Check if host qualifies for verified status
 * Criteria: 5-star average rating and no cancellations
 */
const checkHostVerification = async (hostId: string): Promise<void> => {
  const host = await User.findById(hostId);

  if (!host) {
    return;
  }

  // Verified host criteria
  const hasMinRatings = (host.totalRatings || 0) >= 5;
  const hasFiveStarRating = (host.averageRating || 0) >= 4.8; // Close to 5 stars
  const hasNoCancellations = (host.totalCancellations || 0) === 0;

  if (hasMinRatings && hasFiveStarRating && hasNoCancellations) {
    host.isVerifiedHost = true;
    await host.save();
  }
};

/**
 * Get ratings for a user (as host or guest)
 */
export const getUserRatings = async (
  userId: string,
  ratingType?: "host_to_guest" | "guest_to_host",
  limit: number = 50
): Promise<any> => {
  const query: any = { ratedUser: userId };
  if (ratingType) {
    query.ratingType = ratingType;
  }

  const ratings = await Rating.find(query)
    .populate("booking")
    .populate("ratedBy", "name email username")
    .sort({ createdAt: -1 })
    .limit(limit);

  return ratings;
};

/**
 * Get rating for a specific booking
 */
export const getBookingRatings = async (bookingId: string): Promise<any> => {
  const ratings = await Rating.find({ booking: bookingId })
    .populate("ratedBy", "name email username")
    .populate("ratedUser", "name email username");

  return ratings;
};
