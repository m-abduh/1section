import { Router } from "express";
import { ModulesController } from "./modules.controller";
import { authenticate, optionalAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createModuleSchema, updateModuleSchema } from "./modules.schema";

const router = Router();

router.get("/", optionalAuth, ModulesController.list);
router.get("/categories", ModulesController.getCategories);
router.get("/daily-free", ModulesController.getDailyFree);
router.get("/:slug/access", optionalAuth, ModulesController.checkAccess);
router.get("/:slug", optionalAuth, ModulesController.getBySlug);
router.get("/:slug/recommended", ModulesController.getRecommended);

router.post("/", authenticate, validate(createModuleSchema), ModulesController.create);
router.patch("/:slug", authenticate, validate(updateModuleSchema), ModulesController.update);
router.delete("/:slug", authenticate, ModulesController.remove);

export default router;
