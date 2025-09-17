import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

// Define a custom type for user payload
interface UserPayload {
  id: string;
  username: string;
  email: string;
}

// Extend Express Request to include `user`
export default interface AuthRequest extends Request {
  user?: UserPayload;
}

export const userAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = req.headers.token as string;

    if (!token) {
      res.status(401).json({ message: "Unauthorized: No token provided" });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);

    // Make sure decoded is an object
    if (typeof decoded === "object" && decoded !== null) {
      const { id, username, email } = decoded as UserPayload;
      req.user = { id, username, email };
      next();
    } else {
      res.status(401).json({ message: "Unauthorized: Invalid token payload" });
    }
  } catch (err) {
    res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
  }
};
