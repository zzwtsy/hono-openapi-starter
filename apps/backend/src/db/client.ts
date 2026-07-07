import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import env from "../env.js";
import * as schema from "./schema/index.js";

export const client = postgres(env.DATABASE_URL, { max: 10 });

export const db = drizzle({
  client,
  schema,
  logger: env.NODE_ENV === "development",
});
