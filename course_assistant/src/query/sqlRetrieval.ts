import { getSharedPool } from "../db/pool.js";
import { COURSE_DB_ALLOWED_TABLES } from "./courseDbSchemaDescription.js";

const blockedKeywordPattern = /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke)\b/i;
const queryTimeoutMs = 5000;
const defaultRowLimit = 50;

function validateReadOnlySql(sql: string): string | null {
  const trimmed = sql.trim().replace(/;+\s*$/, "");
  if (!trimmed) return null;
  if (!/^select\b/i.test(trimmed)) return null;
  if (trimmed.includes(";")) return null;
  if (blockedKeywordPattern.test(trimmed)) return null;

  const referencedTables = [...trimmed.matchAll(/\b(?:from|join)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi)].map(
    (match) => match[1].toLowerCase()
  );
  if (referencedTables.some((table) => !COURSE_DB_ALLOWED_TABLES.includes(table))) return null;

  return /\blimit\b/i.test(trimmed) ? trimmed : `${trimmed} limit ${defaultRowLimit}`;
}

export async function runReadOnlySql(sql: string): Promise<Record<string, unknown>[] | null> {
  const safeSql = validateReadOnlySql(sql);
  if (!safeSql) return null;

  const pool = getSharedPool();
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("sql query timed out")), queryTimeoutMs)
  );

  try {
    const result = await Promise.race([pool.query(safeSql), timeoutPromise]);
    return (result as { rows: Record<string, unknown>[] }).rows;
  } catch {
    return null;
  }
}
