import { Router } from "express";
import { AiController } from "./ai.controller";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { generateSchema, autoGenerateSchema, scheduleSchema } from "./ai.schema";

const router = Router();

router.use(authenticate);

router.post("/generate", validate(generateSchema), AiController.generate);
router.get("/categories", AiController.getCategories);
router.post("/auto-generate", validate(autoGenerateSchema), AiController.triggerAutoGenerate);
router.get("/schedule", AiController.getSchedule);
router.post("/schedule", validate(scheduleSchema), AiController.setSchedule);
router.delete("/schedule", AiController.deleteSchedule);

export default router;
