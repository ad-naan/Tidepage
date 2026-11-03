import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getEnv } from "@/server/config/env";

const cookieName = "adnaan_oauth";
const maxAgeSeconds = 600;

type OAuthStatePayload = {
  state: string;
  provider: string;
  returnTo: string;
};

export function newOAuthState() {
  return randomBytes(24).toString("base64url");
}

export async function writeOAuthState(payload: OAuthStatePayload) {
  const value = Buffer.from(JSON.stringify(payload)).toString("base64url");
  (await cookies()).set(cookieName, value, {
    httpOnly: true,
    secure: new URL(getEnv().SITE_URL).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function readOAuthState(): Promise<OAuthStatePayload | null> {
  const raw = (await cookies()).get(cookieName)?.value;
  if (!raw) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    ) as OAuthStatePayload;
    if (
      typeof payload.state !== "string" ||
      typeof payload.provider !== "string" ||
      typeof payload.returnTo !== "string"
    )
      return null;
    return payload;
  } catch {
    return null;
  }
}

export async function clearOAuthState() {
  (await cookies()).delete(cookieName);
}

/** 恒时比较 state，防止用已知值猜测。 */
export function sameOAuthState(stored: string, received: string | null) {
  if (!received || stored.length !== received.length) return false;
  return timingSafeEqual(
    createHash("sha256").update(stored).digest(),
    createHash("sha256").update(received).digest(),
  );
}
