import { Response } from "express";
import { QuizService } from "./quiz.service";
import type { AuthRequest } from "../../types";
import type { SubmitAnswerInput, SaveProgressInput } from "./quiz.schema";
import { asyncHandler } from "../../lib/async-handler";

export namespace QuizController {
  export const getQuestions = asyncHandler(async (req: AuthRequest, res: Response) => {
    const slug = req.params.slug as string;
    const questions = await QuizService.getQuestions(slug);
    res.json(questions);
  });

  export const submit = asyncHandler(async (req: AuthRequest, res: Response) => {
    const slug = req.params.slug as string;
    const body = req.body as SubmitAnswerInput;
    const result = await QuizService.submit(req.user!.userId, slug, body);
    res.json(result);
  });

  export const saveProgress = asyncHandler(async (req: AuthRequest, res: Response) => {
    const slug = req.params.slug as string;
    const body = req.body as SaveProgressInput;
    const result = await QuizService.saveProgress(req.user!.userId, slug, body);
    res.json(result);
  });

  export const getProgress = asyncHandler(async (req: AuthRequest, res: Response) => {
    const slug = req.params.slug as string;
    const result = await QuizService.getProgress(req.user!.userId, slug);
    res.json(result);
  });

  export const getAttempts = asyncHandler(async (req: AuthRequest, res: Response) => {
    const slug = req.params.slug as string;
    const attempts = await QuizService.getAttempts(req.user!.userId, slug);
    res.json(attempts);
  });

  export const getQuizStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await QuizService.getQuizStats(req.user!.userId);
    res.json(result);
  });
}
