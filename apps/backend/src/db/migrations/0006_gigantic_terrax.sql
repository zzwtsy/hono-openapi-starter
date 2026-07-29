CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_user_id" text,
	"actor_org_id" text,
	"actor_role_snapshot" text,
	"action" text NOT NULL,
	"resource_refs" jsonb NOT NULL,
	"before_state" jsonb,
	"after_state" jsonb,
	"changed_fields" jsonb,
	"ip_address" text,
	"user_agent" text,
	"request_id" text,
	"status" text NOT NULL,
	"error_code" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_logs_occurred_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_user_idx" ON "audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_org_idx" ON "audit_logs" USING btree ("actor_org_id");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_refs_idx" ON "audit_logs" USING gin ("resource_refs");