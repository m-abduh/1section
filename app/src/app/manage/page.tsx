"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Crown,
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Ban,
  ExternalLink,
  Loader2,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { paymentsApi, type SubscriptionInfo, type PaymentHistory } from "@/lib/api/payments";
import { format } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";

const PLAN_LABELS: Record<string, string> = {
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
  LIFETIME: "Lifetime",
  FREE: "Free",
};

const PLAN_COLORS: Record<string, string> = {
  MONTHLY: "text-premium",
  YEARLY: "text-premium",
  LIFETIME: "text-amber-500",
  FREE: "text-muted-dark",
};

function StatusBadge({ status }: { status: string }) {
  if (status === "FREE") return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[0.625rem] font-bold uppercase tracking-wider ${PLAN_COLORS[status] || "text-muted-dark"}`}>
      {status === "LIFETIME" ? <Crown size={12} /> : <Clock size={12} />}
      {PLAN_LABELS[status] || status}
    </span>
  );
}

export default function ManagePage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

  const { data: sub, isLoading: subLoading } = useQuery<SubscriptionInfo>({
    queryKey: ["subscription"],
    queryFn: paymentsApi.getSubscription,
    enabled: !!user,
  });

  const { data: history = [], isLoading: historyLoading } = useQuery<PaymentHistory[]>({
    queryKey: ["payment-history"],
    queryFn: paymentsApi.getHistory,
    enabled: !!user,
  });

  const cancelMutation = useMutation({
    mutationFn: paymentsApi.cancelSubscription,
    onSuccess: () => {
      toast.success("Subscription cancelled. You'll retain access until the period ends.");
    },
    onError: (err: Error) => {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(axiosErr?.response?.data?.message || "Failed to cancel subscription");
    },
  });

  const portalMutation = useMutation({
    mutationFn: paymentsApi.createCustomerPortal,
    onSuccess: ({ url }) => {
      if (url) window.open(url, "_blank");
    },
    onError: () => {
      toast.error("Failed to open billing portal");
    },
  });

  const loading = subLoading || historyLoading;
  const canCancel = sub?.subscriptionStatus === "MONTHLY" || sub?.subscriptionStatus === "YEARLY";
  const isCancelled = sub?.subscriptionStatus === "FREE" && sub?.subscriptionEnd;

  if (!user) return null;

  return (
    <div className="mx-auto w-full max-w-[640px] px-6 py-12">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg mb-8 transition-colors no-underline">
        <ArrowLeft size={14} />
        Back to Dashboard
      </Link>

      <h1 className="text-2xl font-black mb-1 tracking-[-0.02em]">Billing</h1>
      <p className="text-sm text-muted mb-8">Manage your subscription and payment history.</p>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="text-muted animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Current Plan */}
          <section className="bg-bg-elevated border border-border-subtle rounded-xl p-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-dark mb-3">Current Plan</h2>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className={`text-lg font-bold ${PLAN_COLORS[sub?.subscriptionStatus || "FREE"] || ""}`}>
                  {PLAN_LABELS[sub?.subscriptionStatus || "FREE"] || "Free"}
                </span>
                <StatusBadge status={sub?.subscriptionStatus || "FREE"} />
              </div>
              {sub?.subscriptionStatus !== "FREE" && (
                <span className={`text-[0.625rem] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                  sub?.subscriptionStatus === "LIFETIME"
                    ? "bg-amber-500/10 text-amber-500"
                    : "bg-premium/10 text-premium"
                }`}>
                  Active
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2 text-sm">
              {sub?.subscriptionEnd && (
                <div className="flex items-center justify-between text-muted">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} />
                    {isCancelled ? "Access until" : "Renewal date"}
                  </span>
                  <span>{format(new Date(sub.subscriptionEnd), "MMM d, yyyy")}</span>
                </div>
              )}
              {sub?.lsSubscriptionId && (
                <div className="flex items-center justify-between text-muted">
                  <span className="flex items-center gap-1.5">
                    <Receipt size={13} />
                    Subscription ID
                  </span>
                  <span className="text-[0.6875rem] font-mono">{sub.lsSubscriptionId.slice(0, 12)}&hellip;</span>
                </div>
              )}
            </div>

            {/* Cancel / Portal actions */}
            <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-border-subtle">
              {canCancel && (
                <button
                  onClick={() => {
                    if (!confirm("Are you sure? Your subscription will remain active until the end of the current billing period. No refund will be issued.")) return;
                    cancelMutation.mutate();
                  }}
                  disabled={cancelMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-red-500 hover:bg-red-500/10 border border-red-500/30 disabled:opacity-50 transition-all"
                >
                  {cancelMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />}
                  {cancelMutation.isPending ? "Cancelling..." : "Cancel Subscription"}
                </button>
              )}
              <button
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-muted hover:text-fg border border-border hover:border-border-light disabled:opacity-50 transition-all"
              >
                {portalMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />}
                {portalMutation.isPending ? "Opening..." : "Update Payment Method"}
              </button>
            </div>

            {isCancelled && (
              <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/15 text-xs text-yellow-600 dark:text-yellow-400">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>
                  Your subscription will end on {format(new Date(sub.subscriptionEnd!), "MMM d, yyyy")}.
                  You can resubscribe after it expires.
                </span>
              </div>
            )}
          </section>

          {/* Payment History */}
          <section className="bg-bg-elevated border border-border-subtle rounded-xl p-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-dark mb-3">Payment History</h2>
            {history.length === 0 ? (
              <p className="text-sm text-muted py-4 text-center">No payment history yet.</p>
            ) : (
              <div className="divide-y divide-border-subtle">
                {history.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        p.status === "SUCCEEDED"
                          ? "bg-emerald-500/10"
                          : p.status === "REFUNDED"
                          ? "bg-orange-500/10"
                          : "bg-red-500/10"
                      }`}>
                        {p.status === "SUCCEEDED" ? (
                          <CheckCircle size={15} className="text-emerald-500" />
                        ) : p.status === "REFUNDED" ? (
                          <AlertTriangle size={15} className="text-orange-500" />
                        ) : (
                          <XCircle size={15} className="text-red-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{PLAN_LABELS[p.planType] || p.planType}</p>
                        <p className="text-[0.6875rem] text-muted-dark">
                          {format(new Date(p.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-bold">
                        {p.currency === "USD" ? "$" : p.currency}{" "}
                        {(p.amount / 100).toFixed(2)}
                      </p>
                      <span className={`text-[0.625rem] font-bold uppercase tracking-wider ${
                        p.status === "SUCCEEDED"
                          ? "text-emerald-500"
                          : p.status === "REFUNDED"
                          ? "text-orange-500"
                          : "text-red-500"
                      }`}>
                        {p.status === "SUCCEEDED" ? "Paid" : p.status === "REFUNDED" ? "Refunded" : "Failed"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
