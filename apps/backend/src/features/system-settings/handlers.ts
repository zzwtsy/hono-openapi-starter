import type { ListSettingsRoute, UpdateSettingRoute } from "./routes.js";
import type { AppRouteHandler } from "@/core/http/context.js";
import { AppError } from "@/core/errors/app-error.js";
import { successResponse } from "@/core/http/response.js";
import { SystemSettingService } from "./service.js";

/** 列出全部系统配置。 */
export const listSettingsHandler: AppRouteHandler<ListSettingsRoute> = async (c) => {
  const items = await SystemSettingService.list();
  return successResponse(c, items);
};

/** upsert 一条系统配置。 */
export const updateSettingHandler: AppRouteHandler<UpdateSettingRoute> = async (c) => {
  const user = c.get("user");
  if (!user) {
    throw new AppError("COMMON_UNAUTHORIZED");
  }
  const { key } = c.req.valid("param");
  const body = c.req.valid("json");
  const setting = await SystemSettingService.upsert(key, body.value, user.id);
  return successResponse(c, setting);
};
