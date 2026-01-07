import Booking from "../modules/booking/booking.model";
import { createNotification } from "../modules/notifications/notification.service";
import User from "../modules/auth/auth.model";
import Vehicle from "../modules/vehicle/vehicle.model";

// Helper function to format date in a user-friendly way
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

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
        // Get user (renter), host, and vehicle details for friendly messages
        const [renter, host, vehicle] = await Promise.all([
          User.findById(booking.user).select('name username'),
          User.findById(booking.host).select('name username'),
          Vehicle.findById(booking.vehicle).select('name')
        ]);

        const renterName = renter?.name || renter?.username || 'Guest';
        const hostName = host?.name || host?.username || 'Host';
        const vehicleName = vehicle?.name || 'your vehicle';
        const formattedDate = formatDate(booking.pickupDate);

        // Friendly message for renter
        const renterMsg = `Your pickup for ${vehicleName} is scheduled for ${formattedDate}. Please arrive on time!`;
        await createNotification(
          booking.user.toString(),
          "upcoming_pickup",
          "Upcoming Pickup Reminder",
          renterMsg,
          { bookingId: booking._id.toString(), pickupDate: booking.pickupDate, vehicleName }
        );

        // Friendly message for host (includes renter name)
        const hostMsg = `${renterName} is scheduled to pick up ${vehicleName} on ${formattedDate}. Please have the vehicle ready!`;
        await createNotification(
          booking.host.toString(),
          "upcoming_pickup",
          "Upcoming Pickup Reminder",
          hostMsg,
          { bookingId: booking._id.toString(), pickupDate: booking.pickupDate, renterName, vehicleName }
        );

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
        // Get user (renter), host, and vehicle details for friendly messages
        const [renter, host, vehicle] = await Promise.all([
          User.findById(booking.user).select('name username'),
          User.findById(booking.host).select('name username'),
          Vehicle.findById(booking.vehicle).select('name')
        ]);

        const renterName = renter?.name || renter?.username || 'Guest';
        const hostName = host?.name || host?.username || 'Host';
        const vehicleName = vehicle?.name || 'the vehicle';
        const formattedDate = formatDate(booking.dropoffDate);

        // Friendly message for renter
        const renterMsg = `Your rental of ${vehicleName} ends on ${formattedDate}. Please return the vehicle on time to avoid late fees.`;
        await createNotification(
          booking.user.toString(),
          "upcoming_dropoff",
          "Return Reminder",
          renterMsg,
          { bookingId: booking._id.toString(), dropoffDate: booking.dropoffDate, vehicleName }
        );

        // Friendly message for host (includes renter name)
        const hostMsg = `${renterName} is scheduled to return ${vehicleName} on ${formattedDate}.`;
        await createNotification(
          booking.host.toString(),
          "upcoming_dropoff",
          "Upcoming Return",
          hostMsg,
          { bookingId: booking._id.toString(), dropoffDate: booking.dropoffDate, renterName, vehicleName }
        );

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