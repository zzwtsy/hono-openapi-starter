import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/** Node 测试用 MSW server(Vitest 官方推荐拦截 fetch)。 */
export const server = setupServer(...handlers);
