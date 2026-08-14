export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", "");
  if (!host || origin !== `${protocol}://${host}`) throw new Error("Invalid request origin");
}

export function normalizeUsername(value: string) {
  return value.trim().toLocaleLowerCase("es");
}

export function normalizeEmail(value?: string | null) {
  const normalized = value?.trim().toLocaleLowerCase("es");
  return normalized || null;
}

