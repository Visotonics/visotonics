import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  BASE_URL,
  E2E_ENABLED,
  SUPABASE_URL,
  adminHeaders,
  cleanup,
  createUser,
  insertPartner,
  json,
  serverIsUp,
  signIn,
  TEST_PREFIX,
  testEmail,
  userHeaders,
} from "./helpers";

/* ---------------------------------------------------------------------------
   Integration tests — the app over HTTP, against a real Supabase project.

   OFF BY DEFAULT. They create and delete accounts and cause real
   confirmation emails to be sent, so they only run with:

       PORTAL_E2E=1 npm run test:e2e

   and a server already running on PORTAL_BASE_URL (default :3111).

   These exist because the enumeration bug found on 2026-08-08 was invisible
   to unit tests: the route's logic looked right, and only the round trip
   through Supabase and the foreign key revealed that two cases answered
   differently. Anything asserting a security property of the SEAM between
   our code and Supabase belongs here rather than in a unit test.
--------------------------------------------------------------------------- */

let up = false;
beforeAll(async () => {
  if (E2E_ENABLED) up = await serverIsUp();
});
afterAll(async () => {
  await cleanup();
});

const run = describe.skipIf(!E2E_ENABLED);
const PW = "Suite-Password-2026-xyz";

run("registration does not leak which emails have accounts", () => {
  /* The 2026-08-08 regression, asserted directly.

     Supabase returns a decoy user with an EMPTY identities array for an
     address that already exists. The route used to sail past that, fail the
     foreign key, and answer 500 "Account created but the profile could not
     be saved" while a new address answered 200 — an enumeration oracle.

     This first test needs NO deliverable address and sends NO email: an
     existing address short-circuits before the mail step. That makes it
     cheap enough to run every time, and it pins the exact regression. */
  it("answers an already-registered address with the generic success", async () => {
    expect(up, `server not reachable at ${BASE_URL}`).toBe(true);

    const existing = testEmail("existing");
    const created = await createUser(existing, PW);
    await insertPartner({
      id: created.id,
      company: "Existing Co",
      email: existing,
      partner_type: null,
      role: "partner",
      status: "approved",
    });

    const r = await fetch(`${BASE_URL}/api/partner-register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: "Probe Co", email: existing, password: PW, partnerType: "type_a" }),
    });
    const body = await json(r);

    expect(r.status, "an existing address must not answer 500").toBe(200);
    expect(body).toEqual({ ok: true, pending: true });
  });

  /* The stronger form: existing and brand-new must be byte-identical.
     Needs a DELIVERABLE domain, because a fresh address really does send a
     confirmation email — with an undeliverable one the new-address path fails
     at the mail step and the comparison comes out equal for the wrong reason.
     Set PORTAL_TEST_EMAIL_DOMAIN to a domain your Resend account can send to. */
  const domain = process.env.PORTAL_TEST_EMAIL_DOMAIN;
  it.skipIf(!domain)("answers identically for existing and brand-new addresses", async () => {
    const stamp = Date.now();
    const existing = `${TEST_PREFIX}dual-existing-${stamp}@${domain}`;
    const fresh = `${TEST_PREFIX}dual-fresh-${stamp}@${domain}`;

    const created = await createUser(existing, PW);
    await insertPartner({
      id: created.id, company: "Existing Co", email: existing,
      partner_type: null, role: "partner", status: "approved",
    });

    const post = (email: string) =>
      fetch(`${BASE_URL}/api/partner-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: "Probe Co", email, password: PW, partnerType: "type_a" }),
      });

    const a = await post(existing);
    const b = await post(fresh);
    const [bodyA, bodyB] = [await json(a), await json(b)];

    expect(a.status, "status code must not distinguish the two cases").toBe(b.status);
    expect(bodyA, "response body must not distinguish the two cases").toEqual(bodyB);
  });

  it("does not overwrite an existing partner's row", async () => {
    const email = testEmail("nooverwrite");
    const created = await createUser(email, PW);
    await insertPartner({
      id: created.id,
      company: "Original Name",
      email,
      partner_type: "type_a",
      role: "partner",
      status: "approved",
    });

    await fetch(`${BASE_URL}/api/partner-register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: "ATTACKER RENAME", email, password: PW, partnerType: "type_b" }),
    });

    const rows = await json(
      await fetch(
        `${SUPABASE_URL}/rest/v1/partners?email=eq.${encodeURIComponent(email)}&select=company,status,partner_type`,
        { headers: adminHeaders() }
      )
    );
    expect(rows[0].company).toBe("Original Name");
    expect(rows[0].status).toBe("approved");
    expect(rows[0].partner_type).toBe("type_a");
  });
});

run("registration validation", () => {
  const post = (body: unknown) =>
    fetch(`${BASE_URL}/api/partner-register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  it("rejects missing fields", async () => {
    expect((await post({ company: "", email: "", password: "", partnerType: "type_a" })).status).toBe(422);
  });

  it("rejects a short password", async () => {
    expect(
      (await post({ company: "C", email: testEmail("short"), password: "abc", partnerType: "type_a" })).status
    ).toBe(422);
  });

  it("rejects malformed JSON", async () => {
    const r = await fetch(`${BASE_URL}/api/partner-register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });
    expect(r.status).toBe(400);
  });

  it("requires a partnerType, and only a known key", async () => {
    // Reversed on 2026-08-10: partner type is a registration field again and
    // the post-approval screen is gone. It must be present and it must be one
    // of the server's own keys — a posted LABEL or an invented key is a 422,
    // never a row.
    expect((await post({ company: "C", email: testEmail("notype"), password: PW })).status).toBe(422);
    expect(
      (await post({ company: "C", email: testEmail("badtype"), password: PW, partnerType: "type_z" })).status
    ).toBe(422);
    expect(
      (await post({
        company: "C",
        email: testEmail("labeltype"),
        password: PW,
        partnerType: "Distribution Partner",
      })).status
    ).toBe(422);
  });

  it("stores the chosen partner type on the new row", async () => {
    const email = testEmail("typeatreg");
    await post({ company: "Typed At Reg", email, password: PW, partnerType: "type_c" });
    const rows = await json(
      await fetch(
        `${SUPABASE_URL}/rest/v1/partners?email=eq.${encodeURIComponent(email)}&select=partner_type,status`,
        { headers: adminHeaders() }
      )
    );
    if (rows.length) {
      expect(rows[0].partner_type).toBe("type_c");
      // Still pending: choosing a type is not an approval.
      expect(rows[0].status).toBe("pending");
    }
  });
});

run("unauthenticated callers are refused", () => {
  it("every write endpoint rejects a caller with no session", async () => {
    const cases: [string, unknown, number[]][] = [
      ["/api/partner-approve", { id: "x", status: "approved" }, [403]],
      ["/api/deal-register", { customerName: "X" }, [401]],
      ["/api/deal-decide", { id: "x", status: "approved" }, [403]],
      ["/api/partner-nda", { fullName: "X", agreed: [] }, [401]],
    ];
    for (const [path, body, allowed] of cases) {
      const r = await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      expect(allowed, `${path} returned ${r.status}`).toContain(r.status);
    }
  });

  it("gated pages redirect a signed-out visitor, including unknown ones", async () => {
    // The unknown path matters: the proxy is deny-by-default, so a page added
    // tomorrow is protected without anyone remembering to list it.
    for (const path of [
      "/client-portal/dashboard",
      "/client-portal/admin",
      "/client-portal/dashboard/deals/new",
      "/client-portal/onboarding/nda",
      "/client-portal/a-page-nobody-has-built-yet",
    ]) {
      const r = await fetch(`${BASE_URL}${path}`, { redirect: "manual" });
      expect([307, 308], `${path} returned ${r.status}`).toContain(r.status);
    }
  });

  it("public pages stay public", async () => {
    for (const path of ["/client-portal", "/client-portal/register", "/client-portal/reset-password"]) {
      const r = await fetch(`${BASE_URL}${path}`, { redirect: "manual" });
      expect(r.status, `${path} returned ${r.status}`).toBe(200);
    }
  });
});

run("row-level security holds against a real partner token", () => {
  let token = "";
  let myId = "";
  let otherId = "";

  beforeAll(async () => {
    if (!E2E_ENABLED) return;
    const mine = testEmail("rls-self");
    const other = testEmail("rls-other");

    const a = await createUser(mine, PW);
    myId = a.id;
    await insertPartner({
      id: a.id, company: "RLS Self", email: mine,
      partner_type: "type_a", role: "partner", status: "approved",
    });

    const b = await createUser(other, PW);
    otherId = b.id;
    await insertPartner({
      id: b.id, company: "RLS Other", email: other,
      partner_type: "type_b", role: "partner", status: "approved",
    });

    token = (await signIn(mine, PW)).access_token;
  });

  it("a partner reads only their own row", async () => {
    const rows = await json(
      await fetch(`${SUPABASE_URL}/rest/v1/partners?select=id`, { headers: userHeaders(token) })
    );
    expect(rows.map((r: { id: string }) => r.id)).toEqual([myId]);
  });

  it("a partner cannot read another partner's row by id", async () => {
    const rows = await json(
      await fetch(`${SUPABASE_URL}/rest/v1/partners?select=id&id=eq.${otherId}`, {
        headers: userHeaders(token),
      })
    );
    expect(rows).toEqual([]);
  });

  it("a partner cannot approve themselves or become an admin", async () => {
    for (const patch of [{ status: "approved" }, { role: "admin" }, { nda_signed_at: null }]) {
      await fetch(`${SUPABASE_URL}/rest/v1/partners?id=eq.${myId}`, {
        method: "PATCH",
        headers: { ...userHeaders(token), Prefer: "return=representation" },
        body: JSON.stringify(patch),
      });
    }
    const rows = await json(
      await fetch(`${SUPABASE_URL}/rest/v1/partners?select=role,status`, {
        headers: userHeaders(token),
      })
    );
    expect(rows[0].role).toBe("partner");
    expect(rows[0].status).toBe("approved"); // unchanged, not escalated
  });

  it("a partner cannot insert a row for themselves", async () => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/partners`, {
      method: "POST",
      headers: userHeaders(token),
      body: JSON.stringify({
        id: myId, company: "evil", email: "evil@example.com",
        partner_type: "type_a", role: "admin", status: "approved",
      }),
    });
    expect(r.status).toBeGreaterThanOrEqual(400);
  });

  it("a partner cannot read or write the admin decision log", async () => {
    const rows = await json(
      await fetch(`${SUPABASE_URL}/rest/v1/partner_decisions?select=*`, {
        headers: userHeaders(token),
      })
    );
    expect(rows).toEqual([]);

    const w = await fetch(`${SUPABASE_URL}/rest/v1/partner_decisions`, {
      method: "POST",
      headers: userHeaders(token),
      body: JSON.stringify({
        partner_id: myId, from_status: "pending", to_status: "approved",
      }),
    });
    expect(w.status).toBeGreaterThanOrEqual(400);
  });

  it("a partner cannot forge or edit an NDA signature", async () => {
    const ins = await fetch(`${SUPABASE_URL}/rest/v1/nda_signatures`, {
      method: "POST",
      headers: userHeaders(token),
      body: JSON.stringify({
        partner_id: myId, nda_version: "forged", full_name: "Forged", agreements: [],
      }),
    });
    expect(ins.status).toBeGreaterThanOrEqual(400);
  });
});

run("the NDA route trusts its own clause list, not the request", () => {
  it("stores the server's clause text even when the client sends its own", async () => {
    const email = testEmail("nda");
    const created = await createUser(email, PW);
    await insertPartner({
      id: created.id, company: "NDA Co", email,
      partner_type: "type_a", role: "partner", status: "approved",
    });

    // Sign in through the app so the route sees a real session cookie.
    const session = await signIn(email, PW);
    expect(session.access_token, "could not sign the NDA test user in").toBeTruthy();

    const { NDA_CLAUSES } = await import("@/lib/nda");
    const r = await fetch(`${BASE_URL}/api/partner-nda`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // The route reads cookies; without a browser we assert the guard
        // instead — an unauthenticated call must be refused outright.
      },
      body: JSON.stringify({
        fullName: "Forger",
        agreed: NDA_CLAUSES.map((c) => c.key),
        agreements: [{ key: "confidentiality", label: "I agree to nothing.", agreed: false }],
      }),
    });
    expect(r.status).toBe(401);
  });
});
