import { Request, Response } from "express";
import {
  handleCreateReview,
  handleUpdateReview,
  handleDeleteReview,
  handleGetAllReviews,
  handleGetByIdReview,
} from "./review.service";

export const createReview = async (req: Request, res: Response) => {
  try {
    const result = await handleCreateReview(req);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(422).json({ error: err.message });
  }
};

export const updateReview = async (req: Request, res: Response) => {
  try {
    const result = await handleUpdateReview(req);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(422).json({ error: err.message });
  }
};

export const deleteReview = async (req: Request, res: Response) => {
  try {
    const result = await handleDeleteReview(req);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(422).json({ error: err.message });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const result = await handleGetByIdReview(req);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(422).json({ error: err.message });
  }
};

export const getAllReviews = async (req: Request, res: Response) => {
  try {
    const result = await handleGetAllReviews(req);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(422).json({ error: err.message });
  }
};
