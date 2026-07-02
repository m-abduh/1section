import { Response, NextFunction } from "express";
import { QuizService } from "./quiz.service";
import type { AuthRequest } from "../../types";
import type { SubmitAnswerInput, SaveProgressInput } from "./quiz.schema";

export namespace QuizController {
  export async function getQuestions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug as string;
      const questions = await QuizService.getQuestions(slug);
      res.json(questions);
    } catch (err) {
      next(err);
    }
  }

  export async function submit(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug as string;
      const body = req.body as SubmitAnswerInput;
      const result = await QuizService.submit(req.user!.userId, slug, body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  export async function saveProgress(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug as string;
      const body = req.body as SaveProgressInput;
      const result = await QuizService.saveProgress(req.user!.userId, slug, body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  export async function getProgress(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug as string;
      const result = await QuizService.getProgress(req.user!.userId, slug);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  export async function getAttempts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug as string;
      const attempts = await QuizService.getAttempts(req.user!.userId, slug);
      res.json(attempts);
    } catch (err) {
      next(err);
    }
  }

  export async function getQuizStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await QuizService.getQuizStats(req.user!.userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
