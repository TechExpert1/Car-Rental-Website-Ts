import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import AuthRequest, { UserPayload } from "./userAuth";

export const hostAuth = (
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

    if (typeof decoded === "object" && decoded !== null) {
      const { id, username, email, role } = decoded as UserPayload;

      if (role !== "host") {
        res.status(403).json({ message: "Forbidden: Only hosts can access" });
        return;
      }

      req.user = { id, username, email, role };
      next();
    } else {
      res.status(401).json({ message: "Unauthorized: Invalid token payload" });
    }
  } catch (err) {
    res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
  }
};
