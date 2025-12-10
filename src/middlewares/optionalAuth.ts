import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import AuthRequest, { UserPayload } from "./userAuth";

/**
 * Optional authentication middleware
 * Allows request to proceed even without a token
 * If token is present, it validates and attaches user to request
 */
export const optionalAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Support both 'token' header and 'Authorization: Bearer' header
    let token = req.headers.token as string;
    
    if (!token) {
      const authHeader = req.headers.authorization as string;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.slice(7); // Remove 'Bearer ' prefix
      }
    }

    // If no token, continue without user
    if (!token) {
      return next();
    }

    // Verify token if present
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);

    if (typeof decoded === "object" && decoded !== null) {
      const { id, username, email, role } = decoded as UserPayload;
      req.user = { id, username, email, role };
    }
    
    next();
  } catch (err) {
    // Token is invalid, but we allow request to proceed without user
    next();
  }
};
