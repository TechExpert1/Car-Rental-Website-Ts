import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Request } from "express";
import User, { IUser } from "./auth.model";

// Signup
export const handleSignup = async (req: Request): Promise<{ user: IUser; token: string }> => {
  try {
    const { username, email, password, confirmPassword, role, identityNumber, idCardProof, addressProof } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) throw new Error("Email already exists");

    if (password !== confirmPassword)
      throw new Error("Passwords do not match");

    const hashedPassword = await bcrypt.hash(password, 10);

    const userData: any = {
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
    };

    // If user is signing up as a host, set approval status to pending
    if (role === "host") {
      userData.hostApprovalStatus = "pending";
      if (identityNumber) userData.identityNumber = identityNumber;
      if (idCardProof) userData.idCardProof = idCardProof;
      if (addressProof) userData.addressProof = addressProof;
    }

    const user = await User.create(userData);

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "90d" }
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

    // Check account status
    if (user.accountStatus === "banned") {
      throw new Error("Your account has been banned. Please contact support.");
    }

    if (user.accountStatus === "inactive") {
      throw new Error("Your account is inactive. Please contact support.");
    }

    // Check host approval status
    if (user.role === "host" && user.hostApprovalStatus !== "approved") {
      if (user.hostApprovalStatus === "rejected") {
        throw new Error(`Your host application was rejected. Reason: ${user.hostRejectionReason || "Not specified"}`);
      }
      throw new Error("Your host application is pending approval. You will be notified once approved.");
    }

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "90d" }
    );

    return { user, token };
  } catch (error: any) {
    console.error("Login Error:", error);
    throw error;
  }
};
