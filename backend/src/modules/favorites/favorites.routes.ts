import { Router } from "express";
import { FavoritesController } from "./favorites.controller";
import { authenticate } from "../../middleware/auth";

const router = Router();

router.use(authenticate);

router.get("/", FavoritesController.list);
router.get("/:slug/check", FavoritesController.check);
router.post("/:slug", FavoritesController.add);
router.delete("/:slug", FavoritesController.remove);

export default router;
