import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { LemonSqueezy } from "../../config/lemon-squeezy";
import { sendToUser } from "../../lib/websocket";

function resolvePlanType(variantName: string): string {
  const name = variantName.toLowerCase();
  if (name.includes("lifetime") || name.includes("life")) return "LIFETIME";
  if (name.includes("year")) return "YEARLY";
  if (name.includes("month")) return "MONTHLY";
  return "MONTHLY";
}

type TxClient = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

async function processWebhookEvent(eventName: string, body: any, eventId: string): Promise<void> {
  const data = body?.data;
  const attrs = data?.attributes || {};
  const customData = body?.meta?.custom_data || {};
  const userId = customData.userId as string | undefined;

  await prisma.$transaction(async (tx) => {
    switch (eventName) {
      case "subscription_payment_success": {
        const subId = String(attrs.subscription_id || "");
        if (!subId) {
          console.error("[Payment Webhook] subscription_payment_success without subscription_id, event:", eventId);
          return;
        }
        const subUser = await tx.user.findFirst({
          where: { lsSubscriptionId: subId },
          select: { id: true },
        });
        if (!subUser) {
          console.error(`[Payment Webhook] No user found for subscription ${subId}, event: ${eventId}`);
          return;
        }

        const vName = attrs.variant_name || "";
        const planType = resolvePlanType(vName);

        await tx.payment.upsert({
          where: { lsOrderId: String(data.id) },
          update: { status: "SUCCEEDED" },
          create: {
            userId: subUser.id,
            lsOrderId: String(data.id),
            amount: attrs.total_usd || 0,
            status: "SUCCEEDED",
            planType: planType as any,
          },
        });
        break;
      }

      default: {
        let effectiveUserId = userId;
        if (!effectiveUserId) {
          const subId = String(attrs.first_subscription?.id || body?.data?.id || "");
          if (subId) {
            const subUser = await tx.user.findFirst({
              where: { lsSubscriptionId: subId },
              select: { id: true },
            });
            if (subUser) effectiveUserId = subUser.id;
          }
        }
        if (!effectiveUserId) return;

        const getPlanType = (): string | null => {
          const vName = attrs.variant_name || "";
          if (!vName) return null;
          return resolvePlanType(vName);
        };

        switch (eventName) {
          case "subscription_created":
          case "subscription_updated": {
            const planType = getPlanType();
            if (!planType) {
              console.error(`[Payment Webhook] Unknown variant in ${eventName}, event: ${eventId}`);
              return;
            }
            const isExpiredOrCancelled = attrs.status === "cancelled" || attrs.status === "expired";
            const status = isExpiredOrCancelled ? "FREE" : planType;
            const endDate = attrs.ends_at ? new Date(attrs.ends_at) : null;

            await tx.user.update({
              where: { id: effectiveUserId },
              data: {
                lsSubscriptionId: String(data.id || ""),
                subscriptionStatus: status as any,
                subscriptionEnd: endDate,
              },
            });

            sendToUser(effectiveUserId, {
              type: "subscription_updated",
              data: { subscriptionStatus: status },
            });

            break;
          }

          case "subscription_cancelled": {
            await tx.user.update({
              where: { id: effectiveUserId },
              data: { subscriptionStatus: "FREE", subscriptionEnd: null },
            });
            sendToUser(effectiveUserId, {
              type: "subscription_updated",
              data: { subscriptionStatus: "FREE" },
            });
            break;
          }

          case "subscription_expired": {
            await tx.user.update({
              where: { id: effectiveUserId },
              data: { subscriptionStatus: "FREE", subscriptionEnd: null },
            });
            sendToUser(effectiveUserId, {
              type: "subscription_updated",
              data: { subscriptionStatus: "FREE" },
            });
            break;
          }

          case "subscription_payment_failed": {
            sendToUser(effectiveUserId, {
              type: "payment_failed",
              data: { message: "Subscription payment failed" },
            });
            break;
          }

          case "order_created": {
            if (attrs.status === "paid") {
              const vName = attrs.first_order_item?.variant_name || attrs.variant_name || "";
              const planType = resolvePlanType(vName);
              if (!vName) {
                console.error(`[Payment Webhook] No variant name in order_created, event: ${eventId}`);
                sendToUser(effectiveUserId, {
                  type: "payment_error",
                  data: { message: "Payment received but could not activate subscription. Contact support." },
                });
                return;
              }

              const subId = String(attrs.first_subscription?.id || "");

              await tx.user.update({
                where: { id: effectiveUserId },
                data: {
                  subscriptionStatus: planType as any,
                  subscriptionEnd: null,
                  lsSubscriptionId: subId,
                },
              });

              if (attrs.customer_id) {
                const cid = String(attrs.customer_id);
                const user = await tx.user.findUnique({
                  where: { id: effectiveUserId },
                  select: { lsCustomerId: true },
                });
                if (!user?.lsCustomerId) {
                  await tx.user.update({
                    where: { id: effectiveUserId },
                    data: { lsCustomerId: cid },
                  }).catch((e: any) => {
                    if (e?.code !== "P2002") throw e;
                  });
                }
              }

              sendToUser(effectiveUserId, {
                type: "payment_success",
                data: { subscriptionStatus: planType },
              });

              await tx.payment.upsert({
                where: { lsOrderId: String(data.id) },
                update: { status: "SUCCEEDED" },
                create: {
                  userId: effectiveUserId,
                  lsOrderId: String(data.id),
                  amount: attrs.total_usd || 0,
                  status: "SUCCEEDED",
                  planType: planType as any,
                },
              });
            }
            break;
          }
        }
      }
    }

    await tx.lemonSqueezyEvent.update({
      where: { id: eventId },
      data: { processed: true, processedAt: new Date() },
    });
  });
}

export namespace PaymentsService {
  export async function createCheckout(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("User not found", 404);

    if (user.subscriptionStatus && user.subscriptionStatus !== "FREE") {
      throw new AppError("You already have an active subscription. Cancel it first.", 400);
    }

    const checkout = await LemonSqueezy.createCheckout({
      email: user.email || undefined,
      custom: { userId: user.id },
    });

    return { url: checkout.url, id: checkout.id };
  }

  export async function handleWebhook(rawBody: string, signature: string, body: any) {
    const eventName = body?.meta?.event_name;
    if (!eventName) {
      console.error("[Payment Webhook] Missing event_name in webhook payload");
      return;
    }

    if (!signature || !LemonSqueezy.verifyWebhook(rawBody, signature)) {
      console.error(`[Payment Webhook] Signature verification failed for event: ${eventName}`);
      return;
    }

    const eventId = body?.meta?.test_mode
      ? `test-${Date.now()}`
      : `${eventName}-${body?.data?.id}`;

    const already = await prisma.lemonSqueezyEvent.findUnique({ where: { id: eventId } });
    if (already?.processed) {
      console.log(`[Payment Webhook] Event already processed: ${eventId}`);
      return;
    }

    if (!already) {
      await prisma.lemonSqueezyEvent.create({
        data: { id: eventId, type: eventName, payload: body },
      });
    }

    try {
      await processWebhookEvent(eventName, body, eventId);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(
        `[Payment Webhook] FAILED event=${eventId} type=${eventName} error=${errMsg}`,
      );

      await prisma.lemonSqueezyEvent.update({
        where: { id: eventId },
        data: {
          error: errMsg,
          retryCount: { increment: 1 },
        },
      }).catch((e) => {
        console.error(`[Payment Webhook] Failed to record error for event ${eventId}:`, e);
      });

      throw err;
    }
  }

  export async function getSubscription(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("User not found", 404);

    const isExpired = user.subscriptionEnd && user.subscriptionEnd < new Date()
      && user.subscriptionStatus !== "LIFETIME";

    return {
      subscriptionStatus: isExpired ? "FREE" : user.subscriptionStatus,
      subscriptionEnd: user.subscriptionEnd?.toISOString() || null,
      lsCustomerId: user.lsCustomerId,
      lsSubscriptionId: user.lsSubscriptionId,
    };
  }

  export async function getHistory(userId: string, all?: boolean) {
    const where = all ? {} : { userId };
    return prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: all ? { user: { select: { id: true, email: true, name: true } } } : undefined,
    });
  }

  export async function createCustomerPortal(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("User not found", 404);
    if (!user.lsCustomerId) throw new AppError("No Lemon Squeezy customer found", 400);

    const url = await LemonSqueezy.getCustomerPortalUrl(user.lsCustomerId);
    return { url };
  }

  export async function cancelSubscription(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("User not found", 404);
    if (!user.lsSubscriptionId) throw new AppError("No active subscription found", 400);
    if (user.subscriptionStatus !== "MONTHLY" && user.subscriptionStatus !== "YEARLY") {
      throw new AppError("Only monthly/yearly subscriptions can be cancelled", 400);
    }

    await LemonSqueezy.cancelSubscription(user.lsSubscriptionId);
    return { cancelled: true };
  }
}
