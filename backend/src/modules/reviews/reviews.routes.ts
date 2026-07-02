import { Router } from "express";
import { ReviewsController } from "./reviews.controller";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createReviewSchema } from "./reviews.schema";

const router = Router();

router.use(authenticate);

router.get("/", ReviewsController.list);
router.post("/", validate(createReviewSchema), ReviewsController.create);

export default router;
