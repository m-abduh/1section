import { api } from "@/lib/axios";

export interface CheckoutResponse {
  url: string;
  id: string;
}

export interface SubscriptionInfo {
  subscriptionStatus: string;
  subscriptionEnd: string | null;
  lsCustomerId: string | null;
  lsSubscriptionId: string | null;
}

export interface PaymentHistory {
  id: string;
  userId: string;
  lsOrderId: string;
  amount: number;
  currency: string;
  status: string;
  planType: string;
  createdAt: string;
}

export const paymentsApi = {
  createCheckout: () =>
    api.post<CheckoutResponse>("/payments/create-checkout", {}).then(r => r.data),

  getSubscription: () =>
    api.get<SubscriptionInfo>("/payments/subscription").then(r => r.data),

  getHistory: () =>
    api.get<PaymentHistory[]>("/payments/history").then(r => r.data),

  createCustomerPortal: () =>
    api.post<{ url: string }>("/payments/customer-portal").then(r => r.data),

  cancelSubscription: () =>
    api.post<{ cancelled: boolean }>("/payments/cancel").then(r => r.data),
};
