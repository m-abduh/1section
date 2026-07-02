import { Router } from "express";
import { NotebooksController } from "./notebooks.controller";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { upsertNotebookSchema } from "./notebooks.schema";

const router = Router();

router.use(authenticate);

router.get("/", NotebooksController.list);
router.get("/:moduleSlug/:nodeId/:slideIndex", NotebooksController.getBySlide);
router.post("/", validate(upsertNotebookSchema), NotebooksController.upsert);
router.delete("/:moduleSlug/:nodeId/:slideIndex", NotebooksController.remove);

export default router;
