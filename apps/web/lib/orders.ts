import { randomBytes, randomUUID } from "node:crypto";

import { and, desc, eq, sql } from "drizzle-orm";

import { getDb, schema } from "./db";
import type { NewOrder, Order, OrderFields } from "./db/schema";

function newAccessToken(): string {
  return randomBytes(32).toString("base64url");
}

export type CreateOrderInput = {
  winnerIndex: number;
  fields: OrderFields;
  imageB64: string;
  layout: string;
  fontStack: string;
};

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const id = randomUUID();
  const row: NewOrder = {
    id,
    accessToken: newAccessToken(),
    status: "pending",
    winnerIndex: String(input.winnerIndex),
    fields: input.fields,
    imageB64: input.imageB64,
    layout: input.layout,
    fontStack: input.fontStack,
  };
  const [inserted] = await getDb().insert(schema.orders).values(row).returning();
  return inserted;
}

export async function getOrderByIdAndToken(
  id: string,
  token: string,
): Promise<Order | null> {
  const rows = await getDb()
    .select()
    .from(schema.orders)
    .where(
      and(eq(schema.orders.id, id), eq(schema.orders.accessToken, token)),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getOrdersByEmail(email: string): Promise<Order[]> {
  return await getDb()
    .select()
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.customerEmail, email),
        eq(schema.orders.status, "fulfilled"),
      ),
    )
    .orderBy(desc(schema.orders.fulfilledAt));
}

export async function updateFieldsAndImage(
  orderId: string,
  fields: OrderFields,
  finalImageB64: string,
): Promise<void> {
  await getDb()
    .update(schema.orders)
    .set({
      fields,
      finalImageB64,
      updatedAt: sql`now()`,
    })
    .where(eq(schema.orders.id, orderId));
}

export async function attachStripeSession(
  orderId: string,
  args: { sessionId: string; checkoutUrl: string },
): Promise<void> {
  await getDb()
    .update(schema.orders)
    .set({
      stripeSessionId: args.sessionId,
      stripeCheckoutUrl: args.checkoutUrl,
      updatedAt: sql`now()`,
    })
    .where(eq(schema.orders.id, orderId));
}

export async function getOrder(id: string): Promise<Order | null> {
  const rows = await getDb()
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getOrderBySession(
  sessionId: string,
): Promise<Order | null> {
  const rows = await getDb()
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.stripeSessionId, sessionId))
    .limit(1);
  return rows[0] ?? null;
}

export async function markPaid(
  orderId: string,
  args: { eventId: string; customerEmail: string | null },
): Promise<boolean> {
  const result = await getDb()
    .update(schema.orders)
    .set({
      status: "paid",
      stripeEventId: args.eventId,
      customerEmail: args.customerEmail,
      paidAt: sql`now()`,
      updatedAt: sql`now()`,
    })
    .where(
      sql`${schema.orders.id} = ${orderId} AND ${schema.orders.stripeEventId} IS NULL`,
    )
    .returning({ id: schema.orders.id });
  return result.length > 0;
}

export async function markFulfilled(
  orderId: string,
  finalImageB64: string,
): Promise<void> {
  await getDb()
    .update(schema.orders)
    .set({
      status: "fulfilled",
      finalImageB64,
      fulfilledAt: sql`now()`,
      updatedAt: sql`now()`,
    })
    .where(eq(schema.orders.id, orderId));
}

export async function markFailed(orderId: string): Promise<void> {
  await getDb()
    .update(schema.orders)
    .set({ status: "failed", updatedAt: sql`now()` })
    .where(eq(schema.orders.id, orderId));
}
