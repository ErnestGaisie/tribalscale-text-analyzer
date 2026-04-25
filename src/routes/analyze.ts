import { Router, Request, Response, NextFunction } from 'express';
import { validateRequest } from '../middleware/validateRequest';
import { analyzeText } from '../services/openai';
import { AnalyzeRequest } from '../types';

const router = Router();

router.post(
  '/analyze',
  validateRequest,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { text } = req.body as AnalyzeRequest;
      const result = await analyzeText(text);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
