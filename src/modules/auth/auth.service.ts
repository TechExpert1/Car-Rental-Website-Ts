import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Request } from "express";
import User, { IUser } from "./auth.model";

// Signup
export const handleSignup = async (req: Request): Promise<{ user: IUser }> => {
  try {
    const { username, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) throw new Error("User already exists");

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role,
    });

    return { user };
  } catch (error: any) {
    console.error("Signup Error:", error);
    throw error;
  }
};

// Login
export const handleLogin = async (
  req: Request
): Promise<{ user: IUser; token: string }> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) throw new Error("Invalid credentials");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid credentials");

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    return { user, token };
  } catch (error: any) {
    console.error("Login Error:", error);
    throw error;
  }
};
