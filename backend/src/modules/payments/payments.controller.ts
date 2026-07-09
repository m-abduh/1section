import { Request, Response, NextFunction } from "express";
import { PaymentsService } from "./payments.service";
import type { AuthRequest } from "../../types";

export namespace PaymentsController {
  export async function createCheckout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await PaymentsService.createCheckout(req.user!.userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  export async function handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.headers["x-signature"] as string;
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      await PaymentsService.handleWebhook(rawBody, signature, req.body);
      res.json({ received: true });
    } catch (err) {
      next(err);
    }
  }

  export async function getSubscription(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sub = await PaymentsService.getSubscription(req.user!.userId);
      res.json(sub);
    } catch (err) {
      next(err);
    }
  }

  export async function getHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const isAdmin = req.user?.role === "ADMIN";
      const all = req.query.all === "true" && isAdmin;
      const history = await PaymentsService.getHistory(req.user!.userId, all);
      res.json(history);
    } catch (err) {
      next(err);
    }
  }

  export async function createCustomerPortal(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await PaymentsService.createCustomerPortal(req.user!.userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  export async function cancelSubscription(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await PaymentsService.cancelSubscription(req.user!.userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
