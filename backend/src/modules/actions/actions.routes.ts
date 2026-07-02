import { Router } from "express";
import { ActionsController } from "./actions.controller";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createActionSchema, updateActionSchema } from "./actions.schema";

const router = Router();

router.use(authenticate);

router.get("/module/:slug", ActionsController.getByModule);
router.get("/", ActionsController.list);
router.get("/:id", ActionsController.getById);
router.post("/", validate(createActionSchema), ActionsController.create);
router.patch("/:id", validate(updateActionSchema), ActionsController.update);
router.delete("/:id", ActionsController.remove);

export default router;
