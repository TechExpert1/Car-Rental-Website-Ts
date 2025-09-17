import { Request, Response } from "express";
import { handleSignup, handleLogin } from "./auth.service";

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await handleSignup(req);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(422).json({ error: err.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await handleLogin(req);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(422).json({ error: err.message });
  }
};
