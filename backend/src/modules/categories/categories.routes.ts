import { Router } from "express";
import { CategoriesController } from "./categories.controller";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createCategorySchema, updateCategorySchema } from "./categories.schema";

const router = Router();

router.get("/", CategoriesController.listAll);
router.post("/", authenticate, validate(createCategorySchema), CategoriesController.create);

router.get("/admin/list", authenticate, CategoriesController.list);
router.get("/:id", authenticate, CategoriesController.getById);
router.patch("/:id", authenticate, validate(updateCategorySchema), CategoriesController.update);
router.delete("/:id", authenticate, CategoriesController.remove);

export default router;
