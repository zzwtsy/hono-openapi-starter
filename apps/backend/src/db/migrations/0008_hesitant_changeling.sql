DROP INDEX "audit_logs_occurred_at_idx";--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "occurred_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "recorded_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "schema_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX "audit_logs_occurred_at_idx" ON "audit_logs" USING btree ("occurred_at");--> statement-breakpoint
ALTER TABLE "audit_logs" DROP COLUMN "actor_role_snapshot";--> statement-breakpoint
ALTER TABLE "audit_logs" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_status_check" CHECK ("audit_logs"."status" in ('success', 'failure'));