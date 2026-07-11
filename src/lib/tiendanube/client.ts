import { prisma } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/tiendanube/crypto";

const API_VERSION = "2025-03";
const USER_AGENT = "Giapura ERP (leonardiyt360@gmail.com)";

export type TiendanubeCredentials = { storeId: string; accessToken: string };

function baseUrl(storeId: string) {
  return `https://api.tiendanube.com/${API_VERSION}/${storeId}`;
}

async function tiendanubeFetch(
  creds: TiendanubeCredentials,
  path: string,
  init: RequestInit = {}
): Promise<unknown> {
  const res = await fetch(`${baseUrl(creds.storeId)}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      "User-Agent": USER_AGENT,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (res.status === 429) {
    const resetSeconds = Number(res.headers.get("x-rate-limit-reset") ?? "2");
    await new Promise((resolve) => setTimeout(resolve, resetSeconds * 1000));
    return tiendanubeFetch(creds, path, init);
  }

  if (!res.ok) {
    throw new Error(`Tiendanube API error ${res.status}: ${await res.text()}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

/** Trae la conexión activa guardada en DB y desencripta el access_token. */
export async function getCredentials(): Promise<TiendanubeCredentials | null> {
  const conexion = await prisma.tiendaNubeConexion.findFirst({ where: { activo: true } });
  if (!conexion) return null;
  return { storeId: conexion.storeId, accessToken: decrypt(conexion.accessTokenEnc) };
}

export async function exchangeCodeForToken(code: string) {
  const res = await fetch("https://www.tiendanube.com/apps/authorize/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.TIENDANUBE_CLIENT_ID,
      client_secret: process.env.TIENDANUBE_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
    }),
  });

  if (!res.ok) {
    throw new Error(`Error intercambiando code por token: ${res.status} ${await res.text()}`);
  }

  return res.json() as Promise<{
    access_token: string;
    token_type: string;
    scope: string;
    user_id: number;
  }>;
}

export function getAuthorizeUrl(state: string) {
  const clientId = process.env.TIENDANUBE_CLIENT_ID;
  return `https://www.tiendanube.com/apps/${clientId}/authorize?state=${encodeURIComponent(state)}`;
}

export async function guardarConexion(storeId: string, accessToken: string, scope: string) {
  const accessTokenEnc = encrypt(accessToken);
  await prisma.tiendaNubeConexion.upsert({
    where: { storeId },
    update: { accessTokenEnc, scope, activo: true },
    create: { storeId, accessTokenEnc, scope, activo: true },
  });
}

export type TiendanubeVariant = {
  id: number;
  sku: string | null;
  stock: number | null;
  price: string | null;
};

export type TiendanubeProduct = {
  id: number;
  name: Record<string, string> | string;
  variants: TiendanubeVariant[];
};

export async function getProduct(
  creds: TiendanubeCredentials,
  productId: string | number
): Promise<TiendanubeProduct> {
  return (await tiendanubeFetch(creds, `/products/${productId}`)) as TiendanubeProduct;
}

export async function getProducts(creds: TiendanubeCredentials): Promise<TiendanubeProduct[]> {
  const products: TiendanubeProduct[] = [];
  let page = 1;
  for (;;) {
    const batch = (await tiendanubeFetch(
      creds,
      `/products?page=${page}&per_page=200`
    )) as TiendanubeProduct[];
    if (!Array.isArray(batch) || batch.length === 0) break;
    products.push(...batch);
    if (batch.length < 200) break;
    page++;
  }
  return products;
}

export async function updateStockAndPrice(
  creds: TiendanubeCredentials,
  items: { variant_id: number; stock?: number; price?: string }[]
) {
  for (let i = 0; i < items.length; i += 50) {
    const chunk = items.slice(i, i + 50);
    await tiendanubeFetch(creds, "/products/stock-price", {
      method: "PATCH",
      body: JSON.stringify(chunk),
    });
  }
}

export type TiendanubeOrderItem = {
  sku: string | null;
  quantity: string | number;
  price: string;
};

export type TiendanubeOrder = {
  id: number;
  number: number;
  created_at: string;
  status: string;
  payment_status: string;
  shipping_status: string;
  contact_name?: string;
  contact_email?: string;
  subtotal: string;
  total: string;
  products: TiendanubeOrderItem[];
};

export async function getOrder(
  creds: TiendanubeCredentials,
  orderId: string | number
): Promise<TiendanubeOrder> {
  return (await tiendanubeFetch(creds, `/orders/${orderId}`)) as TiendanubeOrder;
}

/** Pedidos creados a partir de una fecha (ISO 8601), paginando hasta el final. */
export async function listOrders(
  creds: TiendanubeCredentials,
  createdAtMin: Date
): Promise<TiendanubeOrder[]> {
  const orders: TiendanubeOrder[] = [];
  const perPage = 100;
  let page = 1;

  for (;;) {
    const query = new URLSearchParams({
      created_at_min: createdAtMin.toISOString(),
      status: "any",
      page: String(page),
      per_page: String(perPage),
    });
    const batch = (await tiendanubeFetch(creds, `/orders?${query}`)) as TiendanubeOrder[];
    if (!Array.isArray(batch) || batch.length === 0) break;
    orders.push(...batch);
    if (batch.length < perPage) break;
    page++;
  }

  return orders;
}

export async function registerWebhooks(creds: TiendanubeCredentials, callbackUrl: string) {
  const eventos = [
    "order/created",
    "order/paid",
    "order/cancelled",
    "order/fulfilled",
    "product/updated",
  ];
  for (const evento of eventos) {
    try {
      await tiendanubeFetch(creds, "/webhooks", {
        method: "POST",
        body: JSON.stringify({ event: evento, url: callbackUrl }),
      });
    } catch {
      // Puede que ya esté configurado desde el Partners Portal o duplicado; no es fatal.
    }
  }
}
