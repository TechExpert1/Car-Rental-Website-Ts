import bcrypt from "bcryptjs";
import User, { IUser } from "../auth/auth.model";
import { Request } from "express";
import AuthRequest from "../../middlewares/userAuth";

export const handleUpdateProfile = async (req: AuthRequest) => {
  try {
    const { id } = req.params as { id: string };
    const { currentPassword, newPassword, ...updateData } = req.body;
    const user = (await User.findById(id)) as IUser | null;

    if (!user) throw new Error("User not found");

    if (req.user?.id !== String(user._id))
      throw new Error("Unauthorized to update this profile");

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

export const handleGetProfile = async (req: Request) => {
  try {
    const { id } = req.params as { id: string };
    const user = (await User.findById(id)) as IUser | null;

    if (!user) throw new Error("User not found");

    return { user };
  } catch (error) {
    console.error("Get User Error:", error);
    throw error;
  }
};
