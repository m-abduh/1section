import { Router } from "express";
import { PaymentsController } from "./payments.controller";
import { authenticate } from "../../middleware/auth";

const router = Router();

router.post("/webhook", PaymentsController.handleWebhook);

router.use(authenticate);

router.post("/create-checkout", PaymentsController.createCheckout);
router.get("/subscription", PaymentsController.getSubscription);
router.get("/history", PaymentsController.getHistory);
router.post("/customer-portal", PaymentsController.createCustomerPortal);
router.post("/cancel", PaymentsController.cancelSubscription);

export default router;
