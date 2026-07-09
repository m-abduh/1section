import { Router } from "express";
import { ModulesController } from "./modules.controller";
import { authenticate, optionalAuth, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createModuleSchema, updateModuleSchema } from "./modules.schema";

const router = Router();

router.get("/", optionalAuth, ModulesController.list);
router.get("/categories", ModulesController.getCategories);
router.get("/daily-free", ModulesController.getDailyFree);
router.get("/:slug/access", optionalAuth, ModulesController.checkAccess);
router.get("/:slug/recommended", ModulesController.getRecommended);
router.get("/:slug", optionalAuth, ModulesController.getBySlug);

router.post("/", authenticate, authorize("ADMIN"), validate(createModuleSchema), ModulesController.create);
router.patch("/:slug", authenticate, authorize("ADMIN"), validate(updateModuleSchema), ModulesController.update);
router.delete("/:slug", authenticate, authorize("ADMIN"), ModulesController.remove);

export default router;
