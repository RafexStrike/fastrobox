import "server-only";
import { Pool } from "pg";
import { env } from "@/environment";

const globalForPostgres = globalThis as typeof globalThis & {
  postgresPool?: Pool;
};

export const pool =
  globalForPostgres.postgresPool ??
  new Pool({
    connectionString: env.POSTGRESS_SERVER,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

if (env.NODE_ENV !== "production") {
  globalForPostgres.postgresPool = pool;
}