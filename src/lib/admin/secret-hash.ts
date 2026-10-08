import { createHmac } from "node:crypto";

type Environment = Record<string, string | undefined>;

export function hashSessionToken(token: string, env: Environment) {
  const secret = env.SESSION_SECRET?.trim();
  if (env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
  }
  return createHmac("sha256", secret || "tis-development-session-only").update(token).digest("hex");
}

export function hashAuditValue(value: string, env: Environment) {
  const pepper = env.AUDIT_HASH_SECRET?.trim() || (env.NODE_ENV === "production" ? "" : env.SESSION_SECRET?.trim());
  if (env.NODE_ENV === "production" && (!pepper || pepper.length < 32)) {
    throw new Error("AUDIT_HASH_SECRET must contain at least 32 characters.");
  }
  return createHmac("sha256", pepper || "tis-development-audit-only").update(value).digest("hex");
}
