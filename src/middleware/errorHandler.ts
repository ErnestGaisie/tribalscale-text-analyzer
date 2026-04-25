import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../types';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error('[ErrorHandler]', err.message);

  const body: ErrorResponse = { error: 'An unexpected error occurred. Please try again.' };
  res.status(500).json(body);
}
