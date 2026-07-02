import { Router } from "express";
import { ReflectionsController } from "./reflections.controller";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createReflectionSchema, updateReflectionSchema } from "./reflections.schema";

const router = Router();

router.use(authenticate);

router.get("/", ReflectionsController.list);
router.get("/:id", ReflectionsController.getById);
router.post("/", validate(createReflectionSchema), ReflectionsController.create);
router.put("/:id", validate(updateReflectionSchema), ReflectionsController.update);
router.delete("/:id", ReflectionsController.remove);

export default router;
