// Shared helpers to mask learner PII on coach-side views unless contact-access is approved.
// Per security policy: coaches only see counts and an anonymized label until an admin
// approves their contact-access request for that specific learner.

const HIDDEN = "•••••";

/** Short anonymous label derived from the learner id, e.g. "Learner #A1B2". */
export const anonLabel = (id: string | null | undefined) => {
  if (!id) return "Learner";
  const tail = id.replace(/-/g, "").slice(-4).toUpperCase();
  return `Learner #${tail}`;
};

/** Mask a full name unless the coach has approved access for this learner. */
export const maskName = (
  name: string | null | undefined,
  learnerId: string | null | undefined,
  hasAccess: boolean
) => (hasAccess ? (name || anonLabel(learnerId)) : anonLabel(learnerId));

/** Mask any profile field (city/country/industry/job/etc.) unless access is approved. */
export const maskField = (
  value: string | number | null | undefined,
  hasAccess: boolean,
  fallback: string = "—"
) => (hasAccess ? (value == null || value === "" ? fallback : String(value)) : HIDDEN);
