/* ---------------------------------------------------------------------------
   The partner NDA — version, clause list, and body text.

   *** PLACEHOLDER TEXT. NOT LEGAL COPY. ***
   Everything below is scaffolding so the signing flow can be built and tested
   end to end. It has not been drafted or reviewed by a lawyer and must be
   replaced before a real partner is asked to agree to it. See the checklist
   in docs/10-partner-portal.md.

   Two rules for whoever swaps in the real document:

   1. BUMP `NDA_VERSION` whenever the text or the clause list changes. Every
      signature stores the version it was given, and that is the only thing
      making an old signature record meaningful — without a bump, a revision
      silently rewrites what past partners appear to have agreed to.

   2. Keep the clause `key`s stable if a clause survives a revision, and use a
      NEW key if its meaning changes. The keys are what land in the stored
      `agreements` JSON.

   Client-safe: no server imports here, because the signing form renders the
   clause list in the browser.
--------------------------------------------------------------------------- */

export const NDA_VERSION = "placeholder-2026-08-08";

/** Served from /public. Replace with the real executed document. */
export const NDA_PDF_PATH = "/legal/visotonics-partner-nda.pdf";

export type NdaClause = {
  /** Stable identifier stored against the signature. Do not reuse across
   *  clauses with different meanings. */
  key: string;
  /** The exact sentence the partner ticks. Stored verbatim with the
   *  signature so the record survives a later edit to this file. */
  label: string;
};

export const NDA_CLAUSES: NdaClause[] = [
  {
    key: "confidentiality",
    label:
      "I agree to keep all Visotonics technical, commercial and customer information disclosed to me confidential.",
  },
  {
    key: "permitted-use",
    label:
      "I agree to use the disclosed information only for the purpose of evaluating or carrying out a partnership with Visotonics.",
  },
  {
    key: "no-disclosure",
    label:
      "I agree not to disclose the information to any third party without prior written consent from Visotonics.",
  },
  {
    key: "return-on-request",
    label:
      "I agree to return or destroy all confidential material on request, or when the partnership ends.",
  },
  {
    key: "authority",
    label:
      "I confirm I am authorised to enter into this agreement on behalf of the company named on my account.",
  },
];

/** Rendered in the scrollable panel above the form. Paragraphs, in order. */
export const NDA_BODY: { heading: string; body: string }[] = [
  {
    heading: "1. Purpose",
    body:
      "This agreement governs confidential information disclosed by Visotonics to the partner in connection with evaluating, establishing or carrying out a commercial partnership. It applies to information disclosed through the partner portal and through any related discussions.",
  },
  {
    heading: "2. Confidential information",
    body:
      "Confidential information means any non-public technical, commercial, financial or customer information disclosed by Visotonics, in any form, whether or not marked confidential. It does not include information that is already public, that the partner already lawfully held, or that the partner independently develops without reference to the disclosed material.",
  },
  {
    heading: "3. Obligations",
    body:
      "The partner will keep confidential information secret, will use it only for the agreed purpose, and will not disclose it to any third party without prior written consent. The partner will apply at least the same care to it as to their own confidential information.",
  },
  {
    heading: "4. Duration",
    body:
      "These obligations take effect on the date of signature and continue for the duration of the partnership and for a period afterwards as set out in the executed agreement.",
  },
  {
    heading: "5. Return of material",
    body:
      "On written request, or when the partnership ends, the partner will return or destroy all confidential material in their possession and confirm in writing that they have done so.",
  },
  {
    heading: "6. No licence",
    body:
      "Nothing in this agreement grants the partner any licence or right in Visotonics intellectual property beyond the limited use described above.",
  },
];

/** Shape stored in `nda_signatures.agreements`. */
export type StoredAgreement = { key: string; label: string; agreed: boolean };
