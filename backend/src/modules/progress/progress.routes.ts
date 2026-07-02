import { Router } from "express";
import { ProgressController } from "./progress.controller";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { updateProgressSchema } from "./progress.schema";

const router = Router();

router.use(authenticate);

router.get("/", ProgressController.getAll);
router.get("/continue-learning", ProgressController.getContinueLearning);
router.get("/stats", ProgressController.getStats);
router.get("/streak", ProgressController.getStreak);
router.post("/streak/reset", ProgressController.resetStreak);
router.get("/:slug", ProgressController.getBySlug);
router.put("/:slug", validate(updateProgressSchema), ProgressController.upsert);

export default router;
