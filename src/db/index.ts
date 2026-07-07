import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.ts";

// Configure Node-Postgres connection pool using Cloud SQL environment variables
const pool = new pg.Pool({
  host: process.env.SQL_HOST,
  database: process.env.SQL_DB_NAME,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  port: 5432,
});

// Initialize and export Drizzle ORM client
export const db = drizzle(pool, { schema });
