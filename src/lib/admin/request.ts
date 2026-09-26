import "server-only";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";

export async function getRequestIp() {
  const requestHeaders = await headers();
  const configuredHeader = process.env.TRUSTED_PROXY_IP_HEADER?.trim().toLowerCase();
  if (!configuredHeader) return "unknown";
  if (!new Set(["x-forwarded-for", "x-real-ip", "cf-connecting-ip"]).has(configuredHeader)) {
    throw new Error("TRUSTED_PROXY_IP_HEADER is invalid.");
  }
  const raw = requestHeaders.get(configuredHeader)?.trim();
  if (!raw) return "unknown";
  const value = configuredHeader === "x-forwarded-for" ? raw.split(",")[0]?.trim() : raw;
  return value && value.length <= 100 ? value : "unknown";
}

export function hashSensitiveValue(value: string) {
  const pepper = process.env.AUDIT_HASH_SECRET?.trim() || (process.env.NODE_ENV === "production" ? "" : process.env.SESSION_SECRET?.trim());
  if (process.env.NODE_ENV === "production" && (!pepper || pepper.length < 32)) {
    throw new Error("AUDIT_HASH_SECRET must contain at least 32 characters.");
  }
  return createHmac("sha256", pepper || "tis-development-audit-only").update(value).digest("hex");
}
