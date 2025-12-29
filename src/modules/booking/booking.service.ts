import { Request } from "express";
import Booking, { IBooking } from "./booking.model";
import mongoose from "mongoose";
import { refundPayment } from "../../utils/booking";
import AuthRequest from "../../middlewares/userAuth";
import Review from "../review/review.model";

export const handleUpdateBooking = async (req: AuthRequest) => {
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

export const handleCancelBooking = async (req: AuthRequest) => {
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

export const handleGetAllBooking = async (req: AuthRequest) => {
  try {
    const userId = req.user?.id;
    console.log("========== GET BOOKINGS DEBUG ==========");
    console.log("📝 userId type:", typeof userId);
    console.log("📝 userId value:", userId);
    console.log("📝 Full req.user:", req.user);

    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Check total bookings in database
    const totalBookingsInDB = await Booking.countDocuments({});
    console.log("📊 Total bookings in database:", totalBookingsInDB);

    // Check if any bookings exist for this user (as user or host)
    const userBookingsCount = await Booking.countDocuments({ user: new mongoose.Types.ObjectId(userId) });
    const hostBookingsCount = await Booking.countDocuments({ host: new mongoose.Types.ObjectId(userId) });
    console.log("📊 Bookings where user is renter:", userBookingsCount);
    console.log("📊 Bookings where user is host:", hostBookingsCount);

    // Log all bookings to see what user/host IDs are actually stored
    if (totalBookingsInDB > 0) {
      const allBookings = await Booking.find({}).select('user host bookingStatus paymentStatus').lean();
      console.log("📊 All bookings in DB (user/host/status):");
      allBookings.forEach((b, idx) => {
        console.log(`   [${idx}] user: ${b.user}, host: ${b.host}, status: ${b.bookingStatus}/${b.paymentStatus}`);
      });
    }

    let { page = 1, limit = 10, role, ...filters } = req.query;
    console.log("📝 role:", role);
    console.log("📝 filters:", filters);

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);

    // Filter bookings where user is either the renter (user) or the car owner (host)
    const query: Record<string, any> = {
      $or: [
        { user: new mongoose.Types.ObjectId(userId) },
        { host: new mongoose.Types.ObjectId(userId) }
      ]
    };

    // Optional: filter by specific role if provided
    if (role === 'user') {
      delete query.$or;
      query.user = new mongoose.Types.ObjectId(userId);
      console.log("🔍 Filtering by RENTER role");
    } else if (role === 'host') {
      delete query.$or;
      query.host = new mongoose.Types.ObjectId(userId);
      console.log("🔍 Filtering by HOST role");
    }

    // Handle bookingStatus filter separately (exact match, not regex)
    if (filters.bookingStatus) {
      const status = filters.bookingStatus as string;
      const validStatuses = ["in-progress", "active", "completed", "canceled"];
      if (validStatuses.includes(status)) {
        query.bookingStatus = status;
      }
      delete filters.bookingStatus;
    }

    // Handle paymentStatus filter separately (exact match, not regex)
    if (filters.paymentStatus) {
      const status = filters.paymentStatus as string;
      const validStatuses = ["pending", "succeeded", "failed", "refunded", "partially_refunded"];
      if (validStatuses.includes(status)) {
        query.paymentStatus = status;
      }
      delete filters.paymentStatus;
    }

    // Apply additional filters (regex-based for string fields)
    Object.keys(filters).forEach((key) => {
      const value = filters[key] as string;
      if (value && key !== 'page' && key !== 'limit') {
        query[key] = { $regex: value, $options: "i" };
      }
    });

    console.log("📝 Final MongoDB query:", JSON.stringify(query, null, 2));

    const total = await Booking.countDocuments(query);
    console.log("📊 Bookings matching query:", total);

    const bookings = await Booking.find(query)
      .populate('vehicle', 'name images rent')
      .populate('user', 'name email')
      .populate('host', 'name username email')
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .lean();

    // Get all vehicle IDs from the bookings
    const vehicleIds = bookings
      .map(b => b.vehicle?._id)
      .filter(id => id != null);

    // Find all reviews by current user for these vehicles
    const userReviews = await Review.find({
      user: new mongoose.Types.ObjectId(userId),
      vehicle: { $in: vehicleIds }
    }).select('vehicle').lean();

    // Create a Set of vehicle IDs that the user has reviewed
    const reviewedVehicleIds = new Set(
      userReviews.map(r => r.vehicle.toString())
    );

    // Add isReviewSubmitted field to each booking and ensure host has display name
    const bookingsWithReviewStatus = bookings.map((b: any) => {
      // Check if user is the renter (only renters can submit reviews)
      const isRenter = b.user?._id?.toString() === userId.toString();
      const vehicleId = b.vehicle?._id?.toString();

      // Only set isReviewSubmitted: true if the user is the renter AND has reviewed this vehicle
      const isReviewSubmitted = isRenter && vehicleId
        ? reviewedVehicleIds.has(vehicleId)
        : false;

      // Ensure host has a display name (fallback to username or email)
      if (b.host && !b.host.name) {
        b.host.name = b.host.username || b.host.email || 'Host';
      }

      return {
        ...b,
        isReviewSubmitted,
      };
    });

    console.log("📝 Retrieved bookings:", bookings.length);
    console.log("========== END DEBUG ==========");

    return {
      bookings: bookingsWithReviewStatus,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    };
  } catch (error) {
    console.error("❌ Get All Booking Error:", error);
    throw error;
  }
};

export const handleUserBookingStats = async (req: AuthRequest) => {
  try {
    const userId = req.user?.id;
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

export const handleUserMonthlyRevenue = async (req: AuthRequest) => {
  try {
    const userId = req.user?.id;
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

/**
 * Comprehensive Finance Analytics for Host Dashboard
 * Provides all financial metrics with week-over-week comparisons
 */
export const handleFinanceAnalytics = async (req: AuthRequest) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const { year, month } = req.query;
    const now = new Date();
    const selectedYear = year
      ? parseInt(year as string, 10)
      : now.getFullYear();
    const selectedMonth = month
      ? parseInt(month as string, 10) - 1 // Convert to 0-indexed
      : now.getMonth();

    const baseMatch = {
      host: new mongoose.Types.ObjectId(userId),
      paymentStatus: "succeeded",
      bookingStatus: { $in: ["active", "completed"] },
    };

    // ========================
    // 1. TOTAL REVENUE (All Time)
    // ========================
    const totalRevenueAgg = await Booking.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$hostPayoutAmount" },
          bookingCount: { $sum: 1 }
        }
      },
    ]);
    const totalRevenue = totalRevenueAgg[0]?.totalRevenue || 0;
    const totalBookings = totalRevenueAgg[0]?.bookingCount || 0;

    // ========================
    // 2. AVERAGE REVENUE PER BOOKING (with week-over-week comparison)
    // ========================
    // Current week average
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay()); // Start of this week (Sunday)
    thisWeekStart.setHours(0, 0, 0, 0);

    const thisWeekEnd = new Date(now);
    thisWeekEnd.setHours(23, 59, 59, 999);

    const thisWeekAvgAgg = await Booking.aggregate([
      {
        $match: {
          ...baseMatch,
          createdAt: { $gte: thisWeekStart, $lte: thisWeekEnd },
        },
      },
      {
        $group: {
          _id: null,
          avgRevenue: { $avg: "$hostPayoutAmount" },
          count: { $sum: 1 }
        }
      },
    ]);
    const thisWeekAvgRevenue = thisWeekAvgAgg[0]?.avgRevenue || 0;

    // Last week average
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setMilliseconds(-1); // End of last week

    const lastWeekAvgAgg = await Booking.aggregate([
      {
        $match: {
          ...baseMatch,
          createdAt: { $gte: lastWeekStart, $lte: lastWeekEnd },
        },
      },
      {
        $group: {
          _id: null,
          avgRevenue: { $avg: "$hostPayoutAmount" },
          count: { $sum: 1 }
        }
      },
    ]);
    const lastWeekAvgRevenue = lastWeekAvgAgg[0]?.avgRevenue || 0;

    // Calculate percentage change for average revenue
    const avgRevenuePercentChange = lastWeekAvgRevenue > 0
      ? ((thisWeekAvgRevenue - lastWeekAvgRevenue) / lastWeekAvgRevenue) * 100
      : thisWeekAvgRevenue > 0 ? 100 : 0;

    // Overall average (for display)
    const overallAvgRevenue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    // ========================
    // 3. NEW REVENUE (This Week vs Last Week)
    // ========================
    const thisWeekRevenueAgg = await Booking.aggregate([
      {
        $match: {
          ...baseMatch,
          createdAt: { $gte: thisWeekStart, $lte: thisWeekEnd },
        },
      },
      { $group: { _id: null, revenue: { $sum: "$hostPayoutAmount" } } },
    ]);
    const thisWeekRevenue = thisWeekRevenueAgg[0]?.revenue || 0;

    const lastWeekRevenueAgg = await Booking.aggregate([
      {
        $match: {
          ...baseMatch,
          createdAt: { $gte: lastWeekStart, $lte: lastWeekEnd },
        },
      },
      { $group: { _id: null, revenue: { $sum: "$hostPayoutAmount" } } },
    ]);
    const lastWeekRevenue = lastWeekRevenueAgg[0]?.revenue || 0;

    // Calculate percentage change for new revenue
    const newRevenuePercentChange = lastWeekRevenue > 0
      ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100
      : thisWeekRevenue > 0 ? 100 : 0;

    // ========================
    // 4. MONTHLY INCOME (Selected Month vs Previous Month)
    // ========================
    const selectedMonthStart = new Date(selectedYear, selectedMonth, 1);
    const selectedMonthEnd = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);

    const selectedMonthAgg = await Booking.aggregate([
      {
        $match: {
          ...baseMatch,
          createdAt: { $gte: selectedMonthStart, $lte: selectedMonthEnd },
        },
      },
      { $group: { _id: null, revenue: { $sum: "$hostPayoutAmount" } } },
    ]);
    const selectedMonthRevenue = selectedMonthAgg[0]?.revenue || 0;

    // Previous month
    const prevMonthStart = new Date(selectedYear, selectedMonth - 1, 1);
    const prevMonthEnd = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);

    const prevMonthAgg = await Booking.aggregate([
      {
        $match: {
          ...baseMatch,
          createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd },
        },
      },
      { $group: { _id: null, revenue: { $sum: "$hostPayoutAmount" } } },
    ]);
    const prevMonthRevenue = prevMonthAgg[0]?.revenue || 0;

    // Calculate percentage change for monthly income
    const monthlyIncomePercentChange = prevMonthRevenue > 0
      ? ((selectedMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100
      : selectedMonthRevenue > 0 ? 100 : 0;

    // ========================
    // 5. YEARLY EARNINGS CHART (Monthly Breakdown)
    // ========================
    const yearlyAgg = await Booking.aggregate([
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
          revenue: { $sum: "$hostPayoutAmount" },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { "_id.month": 1 } },
    ]);

    // Create monthly breakdown with labels
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const earningsChart = monthLabels.map((label, index) => {
      const monthData = yearlyAgg.find(item => item._id.month === index + 1);
      return {
        month: label,
        monthIndex: index + 1,
        revenue: monthData?.revenue || 0,
        bookings: monthData?.bookings || 0,
      };
    });

    // Total for the selected year
    const yearlyTotal = earningsChart.reduce((sum, m) => sum + m.revenue, 0);

    // ========================
    // 6. PENDING PAYOUTS
    // ========================
    const pendingPayoutsAgg = await Booking.aggregate([
      {
        $match: {
          host: new mongoose.Types.ObjectId(userId),
          bookingStatus: "completed",
          payoutStatus: "pending",
        },
      },
      {
        $group: {
          _id: null,
          pendingAmount: { $sum: "$hostPayoutAmount" },
          count: { $sum: 1 }
        }
      },
    ]);
    const pendingPayoutAmount = pendingPayoutsAgg[0]?.pendingAmount || 0;
    const pendingPayoutCount = pendingPayoutsAgg[0]?.count || 0;

    return {
      // Summary Cards
      totalRevenue: {
        amount: totalRevenue,
        totalBookings,
      },
      averageRevenuePerBooking: {
        amount: overallAvgRevenue,
        thisWeekAmount: thisWeekAvgRevenue,
        percentChange: parseFloat(avgRevenuePercentChange.toFixed(2)),
        trend: avgRevenuePercentChange >= 0 ? "up" : "down",
      },
      newRevenue: {
        amount: thisWeekRevenue,
        lastWeekAmount: lastWeekRevenue,
        percentChange: parseFloat(newRevenuePercentChange.toFixed(2)),
        trend: newRevenuePercentChange >= 0 ? "up" : "down",
      },
      monthlyIncome: {
        amount: selectedMonthRevenue,
        month: selectedMonth + 1, // Convert back to 1-indexed
        monthName: monthLabels[selectedMonth],
        year: selectedYear,
        previousMonthAmount: prevMonthRevenue,
        percentChange: parseFloat(monthlyIncomePercentChange.toFixed(2)),
        trend: monthlyIncomePercentChange >= 0 ? "up" : "down",
      },
      // Pending Payouts
      pendingPayouts: {
        amount: pendingPayoutAmount,
        count: pendingPayoutCount,
      },
      // Earnings Chart
      earningsChart: {
        year: selectedYear,
        yearlyTotal,
        data: earningsChart,
      },
    };
  } catch (error) {
    console.error("Get Finance Analytics Error:", error);
    throw error;
  }
};
