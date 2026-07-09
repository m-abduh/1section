import crypto from "crypto";
import { env } from "./env";
import { getLsMode } from "./ls-mode";

interface LsAttributes {
  name?: string;
  slug?: string;
  status?: string;
  price?: number;
  interval?: string | null;
  is_subscription?: boolean;
  variant_name?: string;
  total_usd?: number;
  url?: string;
  urls?: { customer_portal: string };
  customer_id?: number;
  first_subscription?: { id: number };
  first_order_item?: { variant_name: string };
  ends_at?: string | null;
  cancelled?: boolean;
  checkout_data?: Record<string, string>;
  checkout_options?: { embed?: boolean; background_color?: string };
  product_options?: { redirect_url?: string };
}

interface LsMeta {
  event_name?: string;
  custom_data?: Record<string, string>;
  test_mode?: boolean;
}

interface LsData {
  id: string;
  type: string;
  attributes: LsAttributes;
}

interface LsResponse {
  data: LsData | LsData[];
  meta?: LsMeta;
}

let cachedApiKey: string | null = null;
let apiKeyCacheExpiry = 0;

async function getApiKey() {
  if (cachedApiKey && Date.now() < apiKeyCacheExpiry) {
    return cachedApiKey;
  }
  const mode = await getLsMode();
  const key = mode === "prod" ? env.lemonSqueezy.prodApiKey : env.lemonSqueezy.devApiKey;
  cachedApiKey = key;
  apiKeyCacheExpiry = Date.now() + 30000;
  return key;
}

const BASE_URL = "https://api.lemonsqueezy.com/v1";
const API_TIMEOUT = 15000;

async function api(path: string, options: RequestInit = {}): Promise<LsResponse> {
  const key = await getApiKey();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${key}`,
        ...options.headers,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Lemon Squeezy API error (${res.status}): ${text}`);
    }

    return res.json() as Promise<LsResponse>;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Lemon Squeezy API timeout after ${API_TIMEOUT}ms: ${path}`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export namespace LemonSqueezy {
  export async function createCheckout(options: {
    email?: string;
    custom?: Record<string, string>;
    redirectUrl?: string;
    embed?: boolean;
  }) {
    const products = await api(`/products?filter[store_id]=${env.lemonSqueezy.storeId}`);
    const productList = products.data as LsData[];
    const firstProduct = productList[0];
    if (!firstProduct) throw new Error("No products found in Lemon Squeezy store");
    const variants = await api(`/variants?filter[product_id]=${firstProduct.id}`);
    const variantList = variants.data as LsData[];
    const firstVariant = variantList[0];
    if (!firstVariant) throw new Error("No variants found for Lemon Squeezy product");
    const variantId = firstVariant.id;
    interface CheckoutBody {
      data: {
        type: "checkouts";
        attributes: {
          checkout_data: {
            email?: string;
            custom?: Record<string, string>;
          };
          checkout_options: {
            embed: boolean;
            background_color: string;
          };
          product_options?: {
            redirect_url: string;
          };
        };
        relationships: {
          store: { data: { type: "stores"; id: string } };
          variant: { data: { type: "variants"; id: string } };
        };
      };
    }

    const body: CheckoutBody = {
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

    const checkoutData = result.data as LsData;
    return {
      url: checkoutData.attributes.url!,
      id: checkoutData.id,
    };
  }

  export async function getSubscription(subscriptionId: string) {
    const result = await api(`/subscriptions/${subscriptionId}`);
    return result.data as LsData;
  }

  export async function getOrder(orderId: string) {
    const result = await api(`/orders/${orderId}`);
    return result.data as LsData;
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
    return result.data as LsData[];
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
    return result.data as LsData;
  }

  export async function getCustomerPortalUrl(customerId: string) {
    const result = await api(`/customers/${customerId}`);
    const customerData = result.data as LsData;
    return (result.data as LsData).attributes.urls!.customer_portal;
  }

  export async function listProducts() {
    const result = await api(`/products?filter[store_id]=${env.lemonSqueezy.storeId}`);
    const data = result.data as LsData[];
    return data.map((item) => ({
      id: item.id,
      attributes: { name: item.attributes.name!, slug: item.attributes.slug!, status: item.attributes.status! },
    }));
  }

  export async function listVariants(productId: string) {
    const result = await api(`/variants?filter[product_id]=${productId}`);
    const data = result.data as LsData[];
    return data.map((item) => ({
      id: item.id,
      attributes: {
        name: item.attributes.name!,
        price: item.attributes.price!,
        interval: item.attributes.interval ?? null,
        is_subscription: item.attributes.is_subscription!,
        status: item.attributes.status!,
      },
    }));
  }

  export async function listAllVariants() {
    const products = await listProducts();
    const results = await Promise.all(
      products.map(async (product) => {
        const variants = await listVariants(product.id);
        return variants.map((v) => ({ ...v, productName: product.attributes.name, productId: product.id }));
      })
    );
    return results.flat();
  }

  export function verifyWebhook(rawBody: string, signature: string): boolean {
    const hmac = crypto.createHmac("sha256", env.lemonSqueezy.webhookSecret);
    hmac.update(rawBody);
    const expected = hmac.digest("hex");
    try {
      const sigBuf = Buffer.from(signature, "hex");
      const expBuf = Buffer.from(expected, "hex");
      return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
    } catch {
      return false;
    }
  }
}
