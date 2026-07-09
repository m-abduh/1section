import { Router } from "express";
import { AiController } from "./ai.controller";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { generateSchema, autoGenerateSchema, scheduleSchema } from "./ai.schema";

const router = Router();

router.use(authenticate);

router.post("/generate", authorize("ADMIN"), validate(generateSchema), AiController.generate);
router.get("/categories", AiController.getCategories);
router.post("/auto-generate", authorize("ADMIN"), validate(autoGenerateSchema), AiController.triggerAutoGenerate);
router.get("/schedule", authorize("ADMIN"), AiController.getSchedule);
router.post("/schedule", authorize("ADMIN"), validate(scheduleSchema), AiController.setSchedule);
router.delete("/schedule", authorize("ADMIN"), AiController.deleteSchedule);

export default router;
