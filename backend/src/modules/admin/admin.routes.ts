import { Router } from "express";
import { AdminController } from "./admin.controller";
import { authenticate, authorize } from "../../middleware/auth";

const router = Router();

router.use(authenticate);

router.get("/ls-mode", authorize("ADMIN"), AdminController.getLsModeConfig);
router.post("/ls-mode", authorize("ADMIN"), AdminController.setLsModeConfig);

export default router;
