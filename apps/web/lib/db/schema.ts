import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const orderStatus = pgEnum("order_status", [
  "pending",
  "paid",
  "fulfilled",
  "failed",
]);

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    accessToken: text("access_token").notNull(),
    status: orderStatus("status").notNull().default("pending"),
    stripeSessionId: text("stripe_session_id"),
    stripeEventId: text("stripe_event_id"),
    winnerIndex: text("winner_index").notNull(),
    fields: jsonb("fields").$type<OrderFields>().notNull(),
    imageB64: text("image_b64").notNull(),
    layout: text("layout").notNull(),
    fontStack: text("font_stack").notNull(),
    finalImageB64: text("final_image_b64"),
    customerEmail: text("customer_email"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    sessionIdx: uniqueIndex("orders_stripe_session_idx").on(
      table.stripeSessionId,
    ),
    eventIdx: uniqueIndex("orders_stripe_event_idx").on(table.stripeEventId),
    accessTokenIdx: uniqueIndex("orders_access_token_idx").on(table.accessToken),
    customerEmailIdx: index("orders_customer_email_idx").on(table.customerEmail),
  }),
);

export type OrderFields = {
  honoree: string;
  event: string;
  date: string;
  time: string;
  location: string;
  customLine: string;
};

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
