import Booking from "../modules/booking/booking.model";
import { createNotification } from "../modules/notifications/notification.service";

// Run checks and create notifications for upcoming pickup/dropoff (24 hours ahead)
export const runNotificationChecks = async () => {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Upcoming pickups in next 24 hours and not yet notified
    const pickupCandidates = await Booking.find({
      bookingStatus: { $ne: "canceled" },
      notifiedPickup: { $ne: true },
      pickupDate: { $gte: now, $lte: in24h },
    });

    for (const booking of pickupCandidates) {
      try {
        const msg = `Pickup for booking ${booking._id} is scheduled at ${booking.pickupDate.toISOString()}`;
        // notify user (renter)
        await createNotification(booking.user.toString(), "upcoming_pickup", "Upcoming pickup", msg, { bookingId: booking._id.toString(), pickupDate: booking.pickupDate });
        // notify host
        await createNotification(booking.host.toString(), "upcoming_pickup", "Upcoming pickup", msg, { bookingId: booking._id.toString(), pickupDate: booking.pickupDate });

        (booking as any).notifiedPickup = true;
        await booking.save();
      } catch (err) {
        console.error("Failed to create pickup notifications for booking", booking._id, err);
      }
    }

    // Upcoming dropoffs in next 24 hours and not yet notified
    const dropoffCandidates = await Booking.find({
      bookingStatus: { $ne: "canceled" },
      notifiedDropoff: { $ne: true },
      dropoffDate: { $gte: now, $lte: in24h },
    });

    for (const booking of dropoffCandidates) {
      try {
        const msg = `Dropoff for booking ${booking._id} is scheduled at ${booking.dropoffDate.toISOString()}`;
        await createNotification(booking.user.toString(), "upcoming_dropoff", "Upcoming dropoff", msg, { bookingId: booking._id.toString(), dropoffDate: booking.dropoffDate });
        await createNotification(booking.host.toString(), "upcoming_dropoff", "Upcoming dropoff", msg, { bookingId: booking._id.toString(), dropoffDate: booking.dropoffDate });

        (booking as any).notifiedDropoff = true;
        await booking.save();
      } catch (err) {
        console.error("Failed to create dropoff notifications for booking", booking._id, err);
      }
    }

    console.log("Notification checks complete: pickups:", pickupCandidates.length, "dropoffs:", dropoffCandidates.length);
  } catch (err) {
    console.error("Error running notification checks:", err);
  }
};