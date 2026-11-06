import "server-only";
import type { OAuthProfile } from "../domain/oauth";
import { resolveOAuthAccount } from "./oauth-accounts";
import { issueSession } from "./session";

export async function loginWithOAuth(profile: OAuthProfile) {
  const user = await resolveOAuthAccount(profile);
  await issueSession(user.id);
  return user;
}
