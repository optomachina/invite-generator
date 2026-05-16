import { sql } from "drizzle-orm";
import {
  index,
  integer,
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

export const hostedInviteStatus = pgEnum("hosted_invite_status", [
  "published",
  "closed",
]);

export const rsvpStatus = pgEnum("rsvp_status", [
  "yes",
  "no",
  "maybe",
]);

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    accessToken: text("access_token").notNull(),
    status: orderStatus("status").notNull().default("pending"),
    stripeSessionId: text("stripe_session_id"),
    stripeCheckoutUrl: text("stripe_checkout_url"),
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
      .default(sql`now()`)
      .$onUpdate(() => new Date()),
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

export type HostedInviteDetails = {
  eventType: string;
  eventTitle: string;
  honoree: string;
  hostName: string;
  date: string;
  startTime: string;
  endTime: string;
  venueName: string;
  address: string;
  rsvpContact: string;
  rsvpDeadline: string;
  dressCode: string;
  registryLink: string;
  specialNotes: string;
  plusOneRules: string;
  maxGuests: string;
};

export type HostedRSVPSettings = {
  isEnabled: boolean;
  allowMaybe: boolean;
  allowPlusOnes: boolean;
  maxPartySize: string;
  askForGuestNote: boolean;
  askForMealChoice: boolean;
};

export const hostedInvites = pgTable(
  "hosted_invites",
  {
    id: text("id").primaryKey(),
    hostToken: text("host_token").notNull(),
    slug: text("slug").notNull(),
    status: hostedInviteStatus("status").notNull().default("published"),
    details: jsonb("details").$type<HostedInviteDetails>().notNull(),
    rsvpSettings: jsonb("rsvp_settings").$type<HostedRSVPSettings>().notNull(),
    imageB64: text("image_b64"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`)
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    slugIdx: uniqueIndex("hosted_invites_slug_idx").on(table.slug),
    hostTokenIdx: uniqueIndex("hosted_invites_host_token_idx").on(table.hostToken),
    statusIdx: index("hosted_invites_status_idx").on(table.status),
  }),
);

export const rsvpResponses = pgTable(
  "rsvp_responses",
  {
    id: text("id").primaryKey(),
    inviteId: text("invite_id")
      .notNull()
      .references(() => hostedInvites.id, { onDelete: "cascade" }),
    guestName: text("guest_name").notNull(),
    status: rsvpStatus("status").notNull(),
    guestCount: integer("guest_count").notNull().default(1),
    note: text("note"),
    mealChoice: text("meal_choice"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    inviteIdx: index("rsvp_responses_invite_idx").on(table.inviteId),
    createdIdx: index("rsvp_responses_created_idx").on(table.createdAt),
  }),
);

export type HostedInvite = typeof hostedInvites.$inferSelect;
export type NewHostedInvite = typeof hostedInvites.$inferInsert;
export type RSVPResponseRow = typeof rsvpResponses.$inferSelect;
export type NewRSVPResponse = typeof rsvpResponses.$inferInsert;
