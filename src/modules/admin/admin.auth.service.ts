import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../auth/auth.model";

/**
 * Admin Login
 */
export const adminLogin = async (email: string, password: string) => {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
        throw new Error("Invalid credentials");
    }

    if (user.role !== "admin") {
        throw new Error("Access denied. Admin privileges required.");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error("Invalid credentials");
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

    return {
        user: {
            id: user._id,
            email: user.email,
            username: user.username,
            name: user.name,
            role: user.role,
        },
        token,
    };
};

/**
 * Generate OTP for password reset
 */
export const generatePasswordResetOTP = async (email: string) => {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
        throw new Error("User not found");
    }

    if (user.role !== "admin") {
        throw new Error("Access denied. Admin privileges required.");
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Set OTP expiry to 15 minutes from now
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);

    user.resetOTP = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // TODO: Send OTP via email
    // For now, we'll return it in the response (in production, only send via email)
    console.log(`Password reset OTP for ${email}: ${otp}`);

    return {
        success: true,
        message: "OTP sent to your email",
        // Remove this in production - only for development
        otp: process.env.NODE_ENV === "development" ? otp : undefined,
    };
};

/**
 * Verify OTP and reset password
 */
export const resetPasswordWithOTP = async (
    email: string,
    otp: string,
    newPassword: string
) => {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
        throw new Error("User not found");
    }

    if (user.role !== "admin") {
        throw new Error("Access denied. Admin privileges required.");
    }

    if (!user.resetOTP || !user.otpExpiry) {
        throw new Error("No OTP request found. Please request a new OTP.");
    }

    if (user.resetOTP !== otp) {
        throw new Error("Invalid OTP");
    }

    if (new Date() > user.otpExpiry) {
        throw new Error("OTP has expired. Please request a new one.");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear OTP fields
    user.password = hashedPassword;
    user.resetOTP = undefined;
    user.otpExpiry = undefined;
    await user.save();

    return {
        success: true,
        message: "Password reset successfully",
    };
};
