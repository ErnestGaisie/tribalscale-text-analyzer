import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../types';

export function validateRequest(req: Request, res: Response, next: NextFunction): void {
  const { text } = req.body as { text?: unknown };

  if (text === undefined || text === null) {
    const body: ErrorResponse = { status: 400, error: "Missing required field: 'text'" };
    res.status(400).json(body);
    return;
  }

  if (typeof text !== 'string') {
    const body: ErrorResponse = { status: 400, error: "Field 'text' must be a string" };
    res.status(400).json(body);
    return;
  }

  if (text.trim().length === 0) {
    const body: ErrorResponse = { status: 400, error: "Field 'text' must not be empty" };
    res.status(400).json(body);
    return;
  }

  next();
}
