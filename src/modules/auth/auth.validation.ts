import { Request, Response, NextFunction } from "express";
import Joi from "joi";

// Joi schema for user validation
const userSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Email must be a valid email address",
    "any.required": "Email is required",
  }),
  username: Joi.string().min(3).max(30).required().messages({
    "string.min": "Username must be at least 3 characters long",
    "string.max": "Username must not exceed 30 characters",
    "any.required": "Username is required",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters long",
    "any.required": "Password is required",
  }),
  image: Joi.string().uri().optional().messages({
    "string.uri": "Image must be a valid URL",
  }),
  resetOTP: Joi.string().optional(),
  otpExpiry: Joi.date().optional(),
  role: Joi.string().valid("customer", "host").default("customer"),
});

// Middleware function
export const validateUser = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { error } = userSchema.validate(req.body, { abortEarly: true });

  if (error) {
    return res.status(400).json({
      errors: error.details.map((err) => err.message),
    });
  }

  next();
};
