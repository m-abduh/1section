import { Router } from "express";
import { CategoriesController } from "./categories.controller";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createCategorySchema, updateCategorySchema } from "./categories.schema";

const router = Router();

router.get("/", CategoriesController.listAll);
router.post("/", authenticate, authorize("ADMIN"), validate(createCategorySchema), CategoriesController.create);

router.get("/admin/list", authenticate, authorize("ADMIN"), CategoriesController.list);
router.get("/:id", authenticate, authorize("ADMIN"), CategoriesController.getById);
router.patch("/:id", authenticate, authorize("ADMIN"), validate(updateCategorySchema), CategoriesController.update);
router.delete("/:id", authenticate, authorize("ADMIN"), CategoriesController.remove);

export default router;
