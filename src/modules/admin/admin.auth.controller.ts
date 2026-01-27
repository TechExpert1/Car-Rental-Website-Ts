import { Request, Response } from "express";
import * as adminAuthService from "./admin.auth.service";

/**
 * Admin login
 */
export const adminLogin = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: "Email and password are required" });
            return;
        }

        const result = await adminAuthService.adminLogin(email, password);
        res.status(200).json({ success: true, ...result });
    } catch (error: any) {
        console.error("Admin login error:", error.message);
        res.status(401).json({ error: error.message });
    }
};

/**
 * Request password reset OTP
 */
export const requestPasswordReset = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { email } = req.body;

        if (!email) {
            res.status(400).json({ error: "Email is required" });
            return;
        }

        const result = await adminAuthService.generatePasswordResetOTP(email);
        res.status(200).json(result);
    } catch (error: any) {
        console.error("Request password reset error:", error.message);
        res.status(400).json({ error: error.message });
    }
};

/**
 * Reset password with OTP
 */
export const resetPassword = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            res
                .status(400)
                .json({ error: "Email, OTP, and new password are required" });
            return;
        }

        if (newPassword.length < 6) {
            res
                .status(400)
                .json({ error: "Password must be at least 6 characters long" });
            return;
        }

        const result = await adminAuthService.resetPasswordWithOTP(
            email,
            otp,
            newPassword
        );
        res.status(200).json(result);
    } catch (error: any) {
        console.error("Reset password error:", error.message);
        res.status(400).json({ error: error.message });
    }
};
