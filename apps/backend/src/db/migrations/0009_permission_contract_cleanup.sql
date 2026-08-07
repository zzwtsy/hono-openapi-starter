-- 权限契约层重构：权限 registry 只保留 code，授权关系使用语义明确的 permission_code。
-- 不修改历史 migration；既有 code 值原位保留，不做数据回填或双读双写。
ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "role_permissions_permission_permissions_name_fk";
--> statement-breakpoint
ALTER TABLE "user_permissions" DROP CONSTRAINT IF EXISTS "user_permissions_permission_permissions_name_fk";
--> statement-breakpoint
ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "role_permissions_role_id_permission_pk";
--> statement-breakpoint
ALTER TABLE "user_permissions" DROP CONSTRAINT IF EXISTS "user_permissions_user_id_permission_org_id_pk";
--> statement-breakpoint
ALTER TABLE "permissions" RENAME COLUMN "name" TO "code";
--> statement-breakpoint
ALTER TABLE "permissions" DROP COLUMN "description";
--> statement-breakpoint
ALTER TABLE "permissions" DROP COLUMN "created_at";
--> statement-breakpoint
ALTER TABLE "permissions" DROP COLUMN "updated_at";
--> statement-breakpoint
ALTER TABLE "role_permissions" RENAME COLUMN "permission" TO "permission_code";
--> statement-breakpoint
ALTER TABLE "user_permissions" RENAME COLUMN "permission" TO "permission_code";
--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_permission_code_pk" PRIMARY KEY("role_id", "permission_code");
--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_permission_code_org_id_pk" PRIMARY KEY("user_id", "permission_code", "org_id");
--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_code_permissions_code_fk" FOREIGN KEY ("permission_code") REFERENCES "public"."permissions"("code") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permission_code_permissions_code_fk" FOREIGN KEY ("permission_code") REFERENCES "public"."permissions"("code") ON DELETE restrict ON UPDATE no action;
