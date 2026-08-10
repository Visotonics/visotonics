import fs from "node:fs";
import path from "node:path";

/* ---------------------------------------------------------------------------
   Shared plumbing for the integration tests.

   Vitest does not load .env.local the way Next does, so we read it ourselves.
   Nothing here is Next-aware on purpose — these tests talk to the running
   server over HTTP exactly as a browser or an attacker would, which is the
   only way to catch bugs that live in the gap between route and database.
--------------------------------------------------------------------------- */

export function loadEnv() {
  const file = path.resolve(__dirname, "..", ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

loadEnv();

export const BASE_URL = process.env.PORTAL_BASE_URL || "http://localhost:3111";
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";
export const SECRET_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";

/** Integration tests mutate a real Supabase project and send real email.
 *  They stay off unless someone opts in deliberately. */
export const E2E_ENABLED =
  process.env.PORTAL_E2E === "1" && !!SUPABASE_URL && !!PUBLISHABLE_KEY && !!SECRET_KEY;

export const adminHeaders = () => ({
  apikey: SECRET_KEY,
  Authorization: `Bearer ${SECRET_KEY}`,
  "Content-Type": "application/json",
});

export async function serverIsUp(): Promise<boolean> {
  try {
    const r = await fetch(`${BASE_URL}/client-portal`, { redirect: "manual" });
    return r.status > 0;
  } catch {
    return false;
  }
}

export async function json(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Every account these tests create carries this prefix, so cleanup can find
 *  them without any chance of touching a real partner. */
export const TEST_PREFIX = "portal-suite-";

export function testEmail(tag: string) {
  return `${TEST_PREFIX}${tag}-${Date.now()}@example.com`;
}

export async function createUser(email: string, password: string, confirm = true) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ email, password, email_confirm: confirm }),
  });
  return json(r);
}

export async function insertPartner(row: Record<string, unknown>) {
  return fetch(`${SUPABASE_URL}/rest/v1/partners`, {
    method: "POST",
    headers: { ...adminHeaders(), Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
}

export async function signIn(email: string, password: string) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: PUBLISHABLE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return json(r);
}

export function userHeaders(accessToken: string) {
  return {
    apikey: PUBLISHABLE_KEY,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

/** Removes every account this suite created. Safe: matches TEST_PREFIX only. */
export async function cleanup() {
  if (!E2E_ENABLED) return;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200`, {
    headers: adminHeaders(),
  });
  const body = await json(res);
  const users: { id: string; email: string }[] = body?.users ?? [];
  for (const u of users.filter((x) => x.email?.startsWith(TEST_PREFIX))) {
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${u.id}`, {
      method: "DELETE",
      headers: adminHeaders(),
    });
  }
}
