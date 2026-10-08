import { createHash, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

type Environment = Record<string, string | undefined>;
type RequestHeaders = Pick<Headers, "get">;

export class TrustedProxyError extends Error {
  readonly status: 403 | 503;

  constructor(status: 403 | 503) {
    super(status === 503 ? "Trusted proxy configuration is required." : "Untrusted proxy request.");
    this.name = "TrustedProxyError";
    this.status = status;
  }
}

export function validateTrustedProxyConfiguration(env: Environment) {
  const header = env.TRUSTED_PROXY_IP_HEADER?.trim().toLowerCase();
  const secret = env.TRUSTED_PROXY_SECRET?.trim();
  if (!header || !["x-real-ip", "x-forwarded-for", "cf-connecting-ip"].includes(header)
    || !secret || secret.length < 32 || secret.length > 256) {
    throw new TrustedProxyError(503);
  }
  return { header, secret };
}

function normalizeIp(raw: string) {
  // The trusted proxy must overwrite the header with ONE address, not append
  // an untrusted X-Forwarded-For chain. Reject ports, zone IDs and duplicates.
  if (raw.length > 45 || raw.includes("%") || !isIP(raw)) throw new TrustedProxyError(403);
  if (isIP(raw) === 4) return raw;
  const normalized = new URL(`http://[${raw}]/`).hostname.slice(1, -1);
  const mapped = /^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/.exec(normalized);
  if (mapped) {
    const upper = Number.parseInt(mapped[1], 16);
    const lower = Number.parseInt(mapped[2], 16);
    return `${upper >> 8}.${upper & 255}.${lower >> 8}.${lower & 255}`;
  }
  return normalized;
}

export function resolveTrustedClientIp(requestHeaders: RequestHeaders, env: Environment) {
  if (env.NODE_ENV !== "production" && !env.TRUSTED_PROXY_SECRET?.trim()) {
    // Local development has no authenticated proxy. Never trust spoofed headers.
    return "development";
  }
  const { header, secret } = validateTrustedProxyConfiguration(env);
  const supplied = requestHeaders.get("x-tis-proxy-token") ?? "";
  if (!supplied || supplied.length > 256
    || !timingSafeEqual(createHash("sha256").update(supplied).digest(), createHash("sha256").update(secret).digest())) {
    throw new TrustedProxyError(403);
  }
  const raw = requestHeaders.get(header)?.trim();
  if (!raw) throw new TrustedProxyError(403);
  return normalizeIp(raw);
}
