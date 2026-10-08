import "server-only";

import { headers } from "next/headers";
import { resolveTrustedClientIp } from "./client-ip";
import { hashAuditValue } from "./secret-hash";

export async function getRequestIp() {
  const requestHeaders = await headers();
  return resolveTrustedClientIp(requestHeaders, process.env);
}

export function hashSensitiveValue(value: string) {
  return hashAuditValue(value, process.env);
}
