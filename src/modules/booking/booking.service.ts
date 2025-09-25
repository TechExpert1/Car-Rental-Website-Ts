import { Request } from "express";
import Booking, { IBooking } from "./booking.model";
import mongoose from "mongoose";
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

export const handleUserBookingStats = async (req: Request) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const baseMatch = {
      host: new mongoose.Types.ObjectId(userId),
      paymentStatus: "succeeded",
      bookingStatus: { $in: ["active", "completed"] },
    };

    // ---- Total Revenue ----
    const totalRevenueAgg = await Booking.aggregate([
      { $match: baseMatch },
      { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } },
    ]);
    const totalRevenue = totalRevenueAgg[0]?.totalRevenue || 0;

    // ---- Last Week Revenue ----
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);

    const lastWeekAgg = await Booking.aggregate([
      {
        $match: {
          ...baseMatch,
          createdAt: { $gte: lastWeek, $lte: today },
        },
      },
      { $group: { _id: null, lastWeekRevenue: { $sum: "$totalAmount" } } },
    ]);
    const lastWeekRevenue = lastWeekAgg[0]?.lastWeekRevenue || 0;

    // ---- Average of Last Week Revenue ----
    const avgLastWeekRevenueAgg = await Booking.aggregate([
      {
        $match: {
          ...baseMatch,
          createdAt: { $gte: lastWeek, $lte: today },
        },
      },
      { $group: { _id: null, avgLastWeekRevenue: { $avg: "$totalAmount" } } },
    ]);
    const avgLastWeekRevenue =
      avgLastWeekRevenueAgg[0]?.avgLastWeekRevenue || 0;

    // ---- Current Month Revenue ----
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    const currentMonthAgg = await Booking.aggregate([
      {
        $match: {
          ...baseMatch,
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      { $group: { _id: null, currentMonthRevenue: { $sum: "$totalAmount" } } },
    ]);
    const currentMonthRevenue = currentMonthAgg[0]?.currentMonthRevenue || 0;

    return {
      totalRevenue,
      lastWeekRevenue,
      avgLastWeekRevenue,
      currentMonthRevenue,
    };
  } catch (error) {
    console.error("Get User Booking Stats Error:", error);
    throw error;
  }
};

export const handleUserMonthlyRevenue = async (req: Request) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const { year } = req.query;
    const selectedYear = year
      ? parseInt(year as string, 10)
      : new Date().getFullYear();

    const baseMatch = {
      host: new mongoose.Types.ObjectId(userId),
      paymentStatus: "succeeded",
      bookingStatus: { $in: ["active", "completed"] },
    };

    const monthlyAgg = await Booking.aggregate([
      {
        $match: {
          ...baseMatch,
          createdAt: {
            $gte: new Date(`${selectedYear}-01-01T00:00:00.000Z`),
            $lte: new Date(`${selectedYear}-12-31T23:59:59.999Z`),
          },
        },
      },
      {
        $group: {
          _id: { month: { $month: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
        },
      },
      { $sort: { "_id.month": 1 } },
    ]);

    const monthlyRevenue: number[] = Array(12).fill(0);
    monthlyAgg.forEach((item) => {
      monthlyRevenue[item._id.month - 1] = item.revenue;
    });

    return {
      monthlyRevenue,
      year: selectedYear,
    };
  } catch (error) {
    console.error("Get User Monthly Revenue Error:", error);
    throw error;
  }
};
