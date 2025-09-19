import { Request, Response } from "express";
import { handleCustomerSupportEmail } from "./customerSupport.service";

export const create = async (req: Request, res: Response) => {
  try {
    const result = await handleCustomerSupportEmail(req);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(422).json({ error: err.message });
  }
};
