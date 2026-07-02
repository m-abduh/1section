import crypto from "crypto";
import { env } from "./env";
import { getLsMode } from "./ls-mode";

function getApiKey() {
  return getLsMode() === "prod" ? env.lemonSqueezy.prodApiKey : env.lemonSqueezy.devApiKey;
}

const BASE_URL = "https://api.lemonsqueezy.com/v1";

async function api(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${getApiKey()}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Lemon Squeezy API error (${res.status}): ${text}`);
  }

  return res.json();
}

export namespace LemonSqueezy {
  export async function createCheckout(options: {
    email?: string;
    custom?: Record<string, string>;
    redirectUrl?: string;
    embed?: boolean;
  }) {
    const products = await api(`/products?filter[store_id]=${env.lemonSqueezy.storeId}`);
    const productList = products.data as any[];
    const firstProduct = productList[0];
    const variants = await api(`/variants?filter[product_id]=${firstProduct.id}`);
    const variantList = variants.data as any[];
    const variantId = variantList[0].id;
    const body: Record<string, any> = {
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            ...(options.email ? { email: options.email } : {}),
            ...(options.custom ? { custom: options.custom } : {}),
          },
          checkout_options: {
            embed: options.embed !== false,
            background_color: "#00000000",
          },
          ...(options.redirectUrl ? {
            product_options: { redirect_url: options.redirectUrl },
          } : {}),
        },
        relationships: {
          store: {
            data: { type: "stores", id: env.lemonSqueezy.storeId },
          },
          variant: {
            data: { type: "variants", id: variantId },
          },
        },
      },
    };

    const result = await api("/checkouts", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return {
      url: result.data.attributes.url as string,
      id: result.data.id as string,
    };
  }

  export async function getSubscription(subscriptionId: string) {
    const result = await api(`/subscriptions/${subscriptionId}`);
    return result.data;
  }

  export async function getOrder(orderId: string) {
    const result = await api(`/orders/${orderId}`);
    return result.data;
  }

  export async function listSubscriptions(params?: {
    customerEmail?: string;
    status?: string;
    variantId?: string;
  }) {
    const search = new URLSearchParams();
    if (params?.customerEmail) search.set("filter[customer_email]", params.customerEmail);
    if (params?.status) search.set("filter[status]", params.status);
    if (params?.variantId) search.set("filter[variant_id]", params.variantId);
    const qs = search.toString();
    const result = await api(`/subscriptions${qs ? `?${qs}` : ""}`);
    return result.data as any[];
  }

  export async function cancelSubscription(subscriptionId: string) {
    const result = await api(`/subscriptions/${subscriptionId}`, {
      method: "PATCH",
      body: JSON.stringify({
        data: {
          type: "subscriptions",
          id: subscriptionId,
          attributes: { cancelled: true },
        },
      }),
    });
    return result.data;
  }

  export async function getCustomerPortalUrl(customerId: string) {
    const result = await api(`/customers/${customerId}`);
    return result.data.attributes.urls.customer_portal as string;
  }

  export async function listProducts() {
    const result = await api(`/products?filter[store_id]=${env.lemonSqueezy.storeId}`);
    return result.data as Array<{
      id: string;
      attributes: { name: string; slug: string; status: string };
    }>;
  }

  export async function listVariants(productId: string) {
    const result = await api(`/variants?filter[product_id]=${productId}`);
    return result.data as Array<{
      id: string;
      attributes: {
        name: string;
        price: number;
        interval: string | null;
        is_subscription: boolean;
        status: string;
      };
    }>;
  }

  export async function listAllVariants() {
    const products = await listProducts();
    const all: any[] = [];
    for (const product of products) {
      const variants = await listVariants(product.id);
      for (const v of variants) {
        all.push({ ...v, productName: product.attributes.name, productId: product.id });
      }
    }
    return all;
  }

  export function verifyWebhook(rawBody: string, signature: string): boolean {
    const hmac = crypto.createHmac("sha256", env.lemonSqueezy.webhookSecret);
    hmac.update(rawBody);
    const expected = hmac.digest("hex");
    return signature === expected;
  }
}
