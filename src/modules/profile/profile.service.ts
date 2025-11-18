import bcrypt from "bcryptjs";
import User, { IUser } from "../auth/auth.model";
import AuthRequest from "../../middlewares/userAuth";
import Booking from "../booking/booking.model";

export const handleUpdateProfile = async (req: AuthRequest) => {
  try {
    const userId = req.user?.id;

    if (!userId) throw new Error("User ID not found in token");

    const { currentPassword, newPassword, ...updateData } = req.body;
    const user = (await User.findById(userId)) as IUser | null;

    if (!user) throw new Error("User not found");

    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) throw new Error("Current password is incorrect");

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updateData.password = hashedPassword;
    }

    Object.assign(user, updateData);
    await user.save();

    return { message: "User updated successfully", user };
  } catch (error) {
    console.error("Update User Error:", error);
    throw error;
  }
};

export const handleGetProfile = async (req: AuthRequest) => {
  try {
    const userId = req.user?.id;

    if (!userId) throw new Error("User ID not found in token");

    const user = (await User.findById(userId)) as IUser | null;

    if (!user) throw new Error("User not found");

    return { user };
  } catch (error) {
    console.error("Get User Error:", error);
    throw error;
  }
};

export const handleGetBookings = async (req: AuthRequest) => {
  try {
    const userId = req.user?.id;

    if (!userId) throw new Error("User ID not found in token");

    const role = (req.query.role as string) || "customer";
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const condition = role === "host" ? { host: userId } : { user: userId };
    const total = await Booking.countDocuments(condition);
    const data = await Booking.find(condition)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    throw error;
  }
};


