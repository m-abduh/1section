import { Router } from "express";
import { QuizController } from "./quiz.controller";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { submitAnswerSchema, saveProgressSchema } from "./quiz.schema";

const router = Router();

router.use(authenticate);

router.get("/stats/overview", QuizController.getQuizStats);
router.get("/:slug/questions", QuizController.getQuestions);
router.post("/:slug/submit", validate(submitAnswerSchema), QuizController.submit);
router.put("/:slug/progress", validate(saveProgressSchema), QuizController.saveProgress);
router.get("/:slug/progress", QuizController.getProgress);
router.get("/:slug/attempts", QuizController.getAttempts);

export default router;
