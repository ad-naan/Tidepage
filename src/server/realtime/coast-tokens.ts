import { createHmac, timingSafeEqual } from "node:crypto";
import {
  coastIdentitySchema,
  coastReceiptSchema,
  type CoastIdentity,
  type CoastReceipt,
} from "@/shared/contracts/coast-memories";

export const COAST_IDENTITY_TTL = 180_000;
export const COAST_RECEIPT_TTL = 300_000;
export const coastDay = (now: number) =>
  new Date(now + 8 * 60 * 60_000).toISOString().slice(0, 10);
function sign(payload: CoastIdentity | CoastReceipt, secret: string) {
  if (secret.length < 32) throw new Error("Coast signing key unavailable");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(`tidepage:coast:v1:${body}`)
    .digest("base64url");
  return `${body}.${signature}`;
}
function verify(raw: string, secret: string): unknown {
  if (secret.length < 32 || raw.length > 4096) return null;
  const parts = raw.split(".");
  if (parts.length !== 2 || !parts.every((p) => /^[A-Za-z0-9_-]+$/.test(p)))
    return null;
  const expected = createHmac("sha256", secret)
    .update(`tidepage:coast:v1:${parts[0]}`)
    .digest();
  const supplied = Buffer.from(parts[1], "base64url");
  if (
    expected.length !== supplied.length ||
    !timingSafeEqual(expected, supplied)
  )
    return null;
  try {
    return JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
export function issueCoastIdentity(
  identity: Pick<CoastIdentity, "subject" | "name" | "host" | "avatarUrl">,
  secret: string,
  now = Date.now(),
) {
  return sign(
    coastIdentitySchema.parse({
      ...identity,
      purpose: "coast-identity",
      issuedAt: now,
      expiresAt: now + COAST_IDENTITY_TTL,
    }),
    secret,
  );
}
export function readCoastIdentity(
  raw: string,
  secret: string,
  now = Date.now(),
): CoastIdentity | null {
  const result = coastIdentitySchema.safeParse(verify(raw, secret));
  if (
    !result.success ||
    result.data.expiresAt <= now ||
    result.data.issuedAt > now + 10_000 ||
    result.data.expiresAt - result.data.issuedAt !== COAST_IDENTITY_TTL
  )
    return null;
  return result.data;
}
export function issueCoastReceipt(
  evidence: Omit<CoastReceipt, "purpose" | "issuedAt" | "expiresAt" | "day">,
  secret: string,
  now = Date.now(),
) {
  return sign(
    coastReceiptSchema.parse({
      ...evidence,
      purpose: "coast-memory",
      day: coastDay(evidence.occurredAt),
      issuedAt: now,
      expiresAt: now + COAST_RECEIPT_TTL,
    }),
    secret,
  );
}
export function readCoastReceipt(
  raw: string,
  secret: string,
  now = Date.now(),
): CoastReceipt | null {
  const result = coastReceiptSchema.safeParse(verify(raw, secret));
  if (
    !result.success ||
    result.data.expiresAt <= now ||
    result.data.issuedAt > now + 10_000 ||
    result.data.expiresAt - result.data.issuedAt !== COAST_RECEIPT_TTL ||
    result.data.day !== coastDay(result.data.occurredAt)
  )
    return null;
  return result.data;
}
