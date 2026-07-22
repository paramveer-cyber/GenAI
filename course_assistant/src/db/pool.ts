import { Pool } from "pg";

let sharedPool: Pool | null = null;

export function getSharedPool(): Pool {
  if (!sharedPool) sharedPool = new Pool({ connectionString: process.env.DATABASE_URL });
  return sharedPool;
}
