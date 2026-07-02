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
    if (!eventName) return;

    if (signature && !LemonSqueezy.verifyWebhook(rawBody, signature)) {
      console.error("LS webhook signature verification failed");
      return;
    }

    const eventId = body?.meta?.test_mode
      ? `test-${Date.now()}`
      : `${eventName}-${body?.data?.id}`;

    const already = await prisma.lemonSqueezyEvent.findUnique({ where: { id: eventId } });
    if (already?.processed) return;

    if (!already) {
      await prisma.lemonSqueezyEvent.create({
        data: { id: eventId, type: eventName, payload: body },
      });
    }

    try {
      const data = body?.data;
      const attrs = data?.attributes || {};
      const customData = body?.meta?.custom_data || {};
      const userId = customData.userId as string | undefined;

      switch (eventName) {
        case "subscription_payment_success": {
          const subId = String(attrs.subscription_id || "");
          if (!subId) break;
          const subUser = await prisma.user.findFirst({
            where: { lsSubscriptionId: subId },
            select: { id: true },
          });
          if (!subUser) break;

          const vName = attrs.variant_name || "";
          const planType = resolvePlanType(vName);

          await prisma.payment.upsert({
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
          // subscription lifecycle events (cancelled/expired/updated) may not carry
          // custom_data.userId — look up by lsSubscriptionId from data.id instead
          let effectiveUserId = userId;
          if (!effectiveUserId) {
            const subId = String(attrs.first_subscription?.id || body?.data?.id || "");
            if (subId) {
              const subUser = await prisma.user.findFirst({
                where: { lsSubscriptionId: subId },
                select: { id: true },
              });
              if (subUser) effectiveUserId = subUser.id;
            }
          }
          if (!effectiveUserId) break;

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
                console.error(`Unknown variant in ${eventName}`);
                break;
              }
              const isExpiredOrCancelled = attrs.status === "cancelled" || attrs.status === "expired";
              const status = isExpiredOrCancelled ? "FREE" : planType;
              const endDate = attrs.ends_at ? new Date(attrs.ends_at) : null;

              await prisma.user.update({
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
              await prisma.user.update({
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
              await prisma.user.update({
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
                  console.error("No variant name in order_created");
                  sendToUser(effectiveUserId, {
                    type: "payment_error",
                    data: { message: "Payment received but could not activate subscription. Contact support." },
                  });
                  break;
                }

                const subId = String(attrs.first_subscription?.id || "");

                await prisma.user.update({
                  where: { id: effectiveUserId },
                  data: {
                    subscriptionStatus: planType as any,
                    subscriptionEnd: null,
                    lsSubscriptionId: subId,
                  },
                });

                if (attrs.customer_id) {
                  const cid = String(attrs.customer_id);
                  const user = await prisma.user.findUnique({
                    where: { id: effectiveUserId },
                    select: { lsCustomerId: true },
                  });
                  if (!user?.lsCustomerId) {
                    await prisma.user.update({
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

                await prisma.payment.upsert({
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

      await prisma.lemonSqueezyEvent.update({
        where: { id: eventId },
        data: { processed: true, processedAt: new Date() },
      });
    } catch (err) {
      console.error("Webhook processing error:", err);
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
