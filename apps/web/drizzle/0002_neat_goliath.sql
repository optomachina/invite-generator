CREATE TYPE "public"."hosted_invite_status" AS ENUM('published', 'closed');--> statement-breakpoint
CREATE TYPE "public"."rsvp_status" AS ENUM('yes', 'no', 'maybe');--> statement-breakpoint
CREATE TABLE "hosted_invites" (
	"id" text PRIMARY KEY NOT NULL,
	"host_token" text NOT NULL,
	"slug" text NOT NULL,
	"status" "hosted_invite_status" DEFAULT 'published' NOT NULL,
	"details" jsonb NOT NULL,
	"rsvp_settings" jsonb NOT NULL,
	"image_b64" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rsvp_responses" (
	"id" text PRIMARY KEY NOT NULL,
	"invite_id" text NOT NULL,
	"guest_name" text NOT NULL,
	"status" "rsvp_status" NOT NULL,
	"guest_count" integer DEFAULT 1 NOT NULL,
	"note" text,
	"meal_choice" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rsvp_responses_guest_count_positive" CHECK ("guest_count" >= 1)
);
--> statement-breakpoint
ALTER TABLE "rsvp_responses" ADD CONSTRAINT "rsvp_responses_invite_id_hosted_invites_id_fk" FOREIGN KEY ("invite_id") REFERENCES "public"."hosted_invites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hosted_invites_slug_idx" ON "hosted_invites" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "hosted_invites_host_token_idx" ON "hosted_invites" USING btree ("host_token");--> statement-breakpoint
CREATE INDEX "hosted_invites_status_idx" ON "hosted_invites" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rsvp_responses_invite_idx" ON "rsvp_responses" USING btree ("invite_id");--> statement-breakpoint
CREATE INDEX "rsvp_responses_created_idx" ON "rsvp_responses" USING btree ("created_at");
