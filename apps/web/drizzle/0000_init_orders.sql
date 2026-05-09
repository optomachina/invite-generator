CREATE TYPE "public"."order_status" AS ENUM('pending', 'paid', 'fulfilled', 'failed');--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"access_token" text NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"stripe_session_id" text,
	"stripe_event_id" text,
	"winner_index" text NOT NULL,
	"fields" jsonb NOT NULL,
	"image_b64" text NOT NULL,
	"layout" text NOT NULL,
	"font_stack" text NOT NULL,
	"final_image_b64" text,
	"customer_email" text,
	"paid_at" timestamp with time zone,
	"fulfilled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "orders_stripe_session_idx" ON "orders" USING btree ("stripe_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_stripe_event_idx" ON "orders" USING btree ("stripe_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_access_token_idx" ON "orders" USING btree ("access_token");--> statement-breakpoint
CREATE INDEX "orders_customer_email_idx" ON "orders" USING btree ("customer_email");