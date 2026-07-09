import { Response } from "express";
import { PaymentsService } from "./payments.service";
import type { AuthRequest, AuthRequestWithRawBody } from "../../types";
import { asyncHandler } from "../../lib/async-handler";

export namespace PaymentsController {
  export const createCheckout = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await PaymentsService.createCheckout(req.user!.userId);
    res.json(result);
  });

  export const handleWebhook = asyncHandler(async (req: AuthRequest, res: Response) => {
    const signature = req.headers["x-signature"] as string;
    const rawBody = (req as AuthRequestWithRawBody).rawBody || JSON.stringify(req.body);
    await PaymentsService.handleWebhook(rawBody, signature, req.body);
    res.json({ received: true });
  });

  export const getSubscription = asyncHandler(async (req: AuthRequest, res: Response) => {
    const sub = await PaymentsService.getSubscription(req.user!.userId);
    res.json(sub);
  });

  export const getHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const isAdmin = req.user?.role === "ADMIN";
    const all = req.query.all === "true" && isAdmin;
    const history = await PaymentsService.getHistory(req.user!.userId, all);
    res.json(history);
  });

  export const createCustomerPortal = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await PaymentsService.createCustomerPortal(req.user!.userId);
    res.json(result);
  });

  export const cancelSubscription = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await PaymentsService.cancelSubscription(req.user!.userId);
    res.json(result);
  });
}
