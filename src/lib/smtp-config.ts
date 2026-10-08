type Environment = Record<string, string | undefined>;

export function getSmtpConfiguration(env: Environment) {
  const host = env.SMTP_HOST?.trim();
  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_PASS;
  const from = env.SMTP_FROM?.trim() || user;
  const to = env.CONTACT_EMAIL?.trim() || from;
  const replyTo = env.SMTP_REPLY_TO?.trim() || from;
  const port = Number(env.SMTP_PORT ?? 587);
  const emailPattern = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;
  if (!host || /[\s\/\r\n]/.test(host) || !user || !pass || !from || !to || !replyTo
    || ![from, to, replyTo].every(value => value.length <= 254 && emailPattern.test(value))
    || !Number.isInteger(port) || port < 1 || port > 65_535
    || (env.SMTP_SECURE !== undefined && !["true", "false"].includes(env.SMTP_SECURE))) {
    throw new Error("SMTP configuration is incomplete or invalid.");
  }
  const secure = env.SMTP_SECURE === "true" || port === 465;
  return {
    transport: {
      host, port, secure,
      requireTLS: !secure,
      auth: { user, pass },
      connectionTimeout: 30_000,
      greetingTimeout: 30_000,
      socketTimeout: 60_000,
      tls: { minVersion: "TLSv1.2" as const, rejectUnauthorized: true }
    },
    from, to, replyTo
  };
}
