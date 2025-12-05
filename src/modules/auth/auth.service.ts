import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Request } from "express";
import User, { IUser } from "./auth.model";

// Signup
export const handleSignup = async (req: Request): Promise<{ user: IUser; token: string }> => { 
  try {
    const { username, email, password, confirmPassword, role } = req.body;

    const existingUser = await User.findOne({ email:email.toLowerCase() });
    if (existingUser) throw new Error("Email already exists");

    if (password !== confirmPassword)
      throw new Error("Passwords do not match");

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email:email.toLowerCase(),
      password: hashedPassword,
      role,
    });

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "30d" }
    );

    return { user, token: token };
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
      { expiresIn: "30d" }
    );

    return { user, token };
  } catch (error: any) {
    console.error("Login Error:", error);
    throw error;
  }
};
