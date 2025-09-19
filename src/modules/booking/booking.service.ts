import { Request } from "express";
import Booking, { IBooking } from "./booking.model";
import { refundPayment } from "../../utils/booking";
export const handleUpdateBooking = async (req: Request) => {
  try {
    const { id } = req.params;
    const booking: IBooking | null = await Booking.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!booking) throw new Error("Booking not found");

    return { message: "Booking updated successfully", booking };
  } catch (error) {
    console.error("Update Booking Error:", error);
    throw error;
  }
};

export const handleCancelBooking = async (req: Request) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) throw new Error("Booking not found");
    console.log(booking.paymentIntentId);
    if (!booking.paymentIntentId)
      throw new Error("Payment intent id is missing from booking ");
    await refundPayment(booking.paymentIntentId);
    const update = await Booking.findByIdAndUpdate(
      id,
      { bookingStatus: "canceled", paymentStatus: "refunded" },
      { new: true }
    );

    return { message: "Booking cancelled successfully", update };
  } catch (error) {
    console.error("Cancelled Booking Error:", error);
    throw error;
  }
};

export const handleGetAllBooking = async (req: Request) => {
  try {
    let { page = 1, limit = 10, ...filters } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);

    const query: Record<string, any> = {};
    Object.keys(filters).forEach((key) => {
      const value = filters[key] as string;
      if (value) {
        query[key] = { $regex: value, $options: "i" };
      }
    });

    const total = await Booking.countDocuments(query);

    const bookings = await Booking.find(query)
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    return {
      bookings,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    };
  } catch (error) {
    console.error("Get All Booking Error:", error);
    throw error;
  }
};
