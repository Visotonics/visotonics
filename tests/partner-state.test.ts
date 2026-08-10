import { describe, expect, it } from "vitest";
import {
  nextStepFor,
  routeFor,
  STEP_ROUTES,
  isPartnerType,
  PARTNER_TYPES,
  PARTNER_TYPE_LABELS,
  PARTNER_TYPE_BLURBS,
  type PartnerRow,
  type PartnerStatus,
  type PartnerType,
} from "@/lib/partner";

/* ---------------------------------------------------------------------------
   The onboarding state machine.

   These are the cheapest tests in the suite and the ones most worth having:
   nextStepFor() is the single authority on where a partner is allowed to be,
   and every gated page redirects to its answer. A wrong answer here is not a
   cosmetic bug — it is someone seeing a screen they haven't earned.

   Pure function, no database, no server, no network.
--------------------------------------------------------------------------- */

function partner(over: Partial<PartnerRow> = {}): PartnerRow {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    company: "Test Co",
    email: "test@example.com",
    partner_type: null,
    role: "partner",
    status: "pending",
    rejection_reason: null,
    decided_at: null,
    decided_by: null,
    nda_signed_at: null,
    created_at: "2026-01-01T00:00:00Z",
    crm_synced_at: null,
    ...over,
  };
}

const SIGNED = "2026-01-02T00:00:00Z";

describe("nextStepFor — the happy path, in order", () => {
  it("a brand new registration is pending", () => {
    expect(nextStepFor(partner())).toBe("pending");
  });

  it("an approved partner must sign the NDA", () => {
    expect(nextStepFor(partner({ status: "approved", partner_type: "type_a" }))).toBe("sign-nda");
  });

  it("approved and signed reaches the dashboard", () => {
    expect(
      nextStepFor(partner({ status: "approved", partner_type: "type_a", nda_signed_at: SIGNED }))
    ).toBe("dashboard");
  });

  it("partner_type no longer routes — a legacy NULL row still reaches the NDA", () => {
    // The choose-type step was removed on 2026-08-10 when partner type went
    // back onto the registration form. Rows written before that hold NULL and
    // must not be stranded: they carry on to the NDA like anyone else.
    expect(nextStepFor(partner({ status: "approved" }))).toBe("sign-nda");
    expect(
      nextStepFor(partner({ status: "approved", partner_type: null, nda_signed_at: SIGNED }))
    ).toBe("dashboard");
  });
});

describe("nextStepFor — nobody skips a step", () => {
  it("a pending partner cannot reach sign-nda or dashboard", () => {
    for (const over of [
      { partner_type: "type_a" as PartnerType },
      { nda_signed_at: SIGNED },
      { partner_type: "type_b" as PartnerType, nda_signed_at: SIGNED },
    ]) {
      // Even with later fields somehow populated, status gates everything.
      expect(nextStepFor(partner({ status: "pending", ...over }))).toBe("pending");
    }
  });

  it("a rejected partner is rejected regardless of how far they had got", () => {
    expect(
      nextStepFor(
        partner({ status: "rejected", partner_type: "type_c", nda_signed_at: SIGNED })
      )
    ).toBe("rejected");
  });

  it("rejection outranks approval-shaped data — status is checked before type", () => {
    // Guards the ordering inside nextStepFor: if the partner_type check ever
    // moved above the status check, a rejected partner would be sent to the
    // NDA instead of the rejection screen.
    expect(nextStepFor(partner({ status: "rejected", partner_type: "type_a" }))).toBe("rejected");
  });

  it("a type cannot substitute for signing", () => {
    // The NDA is the only remaining gate between approval and the dashboard,
    // so having a type is not enough on its own.
    expect(
      nextStepFor(partner({ status: "approved", partner_type: "type_a" }))
    ).toBe("sign-nda");
  });
});

describe("nextStepFor — admins", () => {
  it("an admin goes straight to admin, whatever else the row says", () => {
    const shapes: Partial<PartnerRow>[] = [
      {},
      { status: "pending" },
      { status: "rejected", rejection_reason: "no" },
      { status: "approved", partner_type: "type_b", nda_signed_at: SIGNED },
    ];
    for (const s of shapes) {
      expect(nextStepFor(partner({ role: "admin", ...s }))).toBe("admin");
    }
  });

  it("role is checked first — an unapproved admin is still an admin", () => {
    expect(nextStepFor(partner({ role: "admin", status: "pending" }))).toBe("admin");
  });
});

describe("nextStepFor — exhaustive over every reachable combination", () => {
  const statuses: PartnerStatus[] = ["pending", "approved", "rejected"];
  const types: (PartnerType | null)[] = [null, "type_a", "type_b", "type_c"];
  const signed = [null, SIGNED];

  it("always returns a known step, never undefined", () => {
    for (const role of ["partner", "admin"] as const)
      for (const status of statuses)
        for (const partner_type of types)
          for (const nda_signed_at of signed) {
            const step = nextStepFor(partner({ role, status, partner_type, nda_signed_at }));
            expect(STEP_ROUTES[step], `no route for step ${step}`).toBeTruthy();
          }
  });

  it("only ever sends a non-approved partner to pending or rejected", () => {
    for (const status of ["pending", "rejected"] as PartnerStatus[])
      for (const partner_type of types)
        for (const nda_signed_at of signed) {
          const step = nextStepFor(partner({ status, partner_type, nda_signed_at }));
          expect(["pending", "rejected"]).toContain(step);
        }
  });

  it("never returns dashboard unless approved AND signed", () => {
    for (const status of statuses)
      for (const partner_type of types)
        for (const nda_signed_at of signed) {
          const row = partner({ status, partner_type, nda_signed_at });
          if (nextStepFor(row) === "dashboard") {
            expect(row.status).toBe("approved");
            expect(row.nda_signed_at).not.toBeNull();
          }
        }
  });

  it("partner_type is inert — it never changes the answer", () => {
    // The direct replacement for the removed "approved AND typed" assertion.
    // Type is now collected at registration and read by the UI only; if it
    // ever creeps back into the router, this fails.
    for (const role of ["partner", "admin"] as const)
      for (const status of statuses)
        for (const nda_signed_at of signed) {
          const answers = types.map((partner_type) =>
            nextStepFor(partner({ role, status, partner_type, nda_signed_at }))
          );
          expect(new Set(answers).size, `partner_type changed the step for ${role}/${status}`).toBe(1);
        }
  });

  it("choose-type is gone from the union and from the route table", () => {
    expect(Object.keys(STEP_ROUTES)).not.toContain("choose-type");
    expect(Object.values(STEP_ROUTES)).not.toContain(
      "/client-portal/onboarding/partner-type"
    );
  });
});

describe("routeFor", () => {
  it("maps every step to a /client-portal path", () => {
    for (const route of Object.values(STEP_ROUTES)) {
      expect(route.startsWith("/client-portal")).toBe(true);
    }
  });

  it("sends an onboarding partner to the step that owns that screen", () => {
    expect(routeFor(partner({ status: "approved" }))).toBe("/client-portal/onboarding/nda");
    expect(routeFor(partner({ status: "approved", partner_type: "type_a" }))).toBe(
      "/client-portal/onboarding/nda"
    );
    expect(
      routeFor(partner({ status: "approved", partner_type: "type_a", nda_signed_at: SIGNED }))
    ).toBe("/client-portal/dashboard");
  });

  it("keeps pending and rejected on the dashboard, which renders them", () => {
    expect(routeFor(partner({ status: "pending" }))).toBe("/client-portal/dashboard");
    expect(routeFor(partner({ status: "rejected" }))).toBe("/client-portal/dashboard");
  });

  it("sends admins to the queue", () => {
    expect(routeFor(partner({ role: "admin" }))).toBe("/client-portal/admin");
  });
});

describe("partner type vocabulary", () => {
  it("accepts only the three known keys", () => {
    for (const t of PARTNER_TYPES) expect(isPartnerType(t)).toBe(true);
    for (const bad of ["type_d", "admin", "", null, undefined, 1, {}, ["type_a"]]) {
      expect(isPartnerType(bad)).toBe(false);
    }
  });

  it("every type has a label and a blurb", () => {
    // Catches a type being added to PARTNER_TYPES without its copy, which
    // would render an empty option on the selection screen.
    for (const t of PARTNER_TYPES) {
      expect(PARTNER_TYPE_LABELS[t]?.length ?? 0).toBeGreaterThan(0);
      expect(PARTNER_TYPE_BLURBS[t]?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("keys stay as type_a/b/c — renaming them needs a data migration", () => {
    // The database check constraint in 0002 hardcodes these. If someone
    // "tidies" the keys to match the labels, existing rows stop validating.
    expect([...PARTNER_TYPES]).toEqual(["type_a", "type_b", "type_c"]);
  });
});
