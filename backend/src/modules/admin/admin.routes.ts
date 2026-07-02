import { Router } from "express";
import { AdminController } from "./admin.controller";
import { authenticate } from "../../middleware/auth";

const router = Router();

router.use(authenticate);

router.get("/ls-mode", AdminController.getLsModeConfig);
router.post("/ls-mode", AdminController.setLsModeConfig);

export default router;
