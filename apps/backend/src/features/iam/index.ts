import { createRouter } from "@/core/app/create-router.js";

import * as handlers from "./handlers.js";
import * as routes from "./routes.js";

const router = createRouter()
  .openapi(routes.listPermissionsRoute, handlers.listPermissionsHandler)
  .openapi(routes.listUsersRoute, handlers.listUsersHandler)
  .openapi(routes.listRolesRoute, handlers.listRolesHandler)
  .openapi(routes.createRoleRoute, handlers.createRoleHandler)
  .openapi(routes.updateRoleRoute, handlers.updateRoleHandler)
  .openapi(routes.deleteRoleRoute, handlers.deleteRoleHandler)
  .openapi(routes.listRolePermissionsRoute, handlers.listRolePermissionsHandler)
  .openapi(routes.assignRolePermissionsRoute, handlers.assignRolePermissionsHandler)
  .openapi(routes.deleteRolePermissionRoute, handlers.deleteRolePermissionHandler)
  .openapi(routes.assignUserRoleRoute, handlers.assignUserRoleHandler)
  .openapi(routes.deleteUserRoleRoute, handlers.deleteUserRoleHandler)
  .openapi(routes.assignUserPermissionRoute, handlers.assignUserPermissionHandler)
  .openapi(routes.deleteUserPermissionRoute, handlers.deleteUserPermissionHandler)
  .openapi(routes.listUserPermissionsRoute, handlers.listUserPermissionsHandler)
  .openapi(routes.listUserRolesRoute, handlers.listUserRolesHandler)
  .openapi(routes.listUserDirectPermissionsRoute, handlers.listUserDirectPermissionsHandler)
  .openapi(routes.listOrganizationsRoute, handlers.listOrganizationsHandler)
  .openapi(routes.createOrganizationRoute, handlers.createOrganizationHandler)
  .openapi(routes.getOrganizationRoute, handlers.getOrganizationHandler)
  .openapi(routes.updateOrganizationRoute, handlers.updateOrganizationHandler)
  .openapi(routes.deleteOrganizationRoute, handlers.deleteOrganizationHandler);

export default router;
