export function getAppUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    "http://localhost:3000"

  return url.replace(/\/$/, "")
}

export function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET

  if (secret && secret.length >= 32) {
    return new TextEncoder().encode(secret)
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET must be set in .env (min 32 characters). Generate: openssl rand -base64 32"
    )
  }

  console.warn(
    "[auth] SESSION_SECRET not set — using insecure dev fallback. Set SESSION_SECRET in .env"
  )
  return new TextEncoder().encode("dev-insecure-session-secret-change-me!!")
}

export const SESSION_COOKIE = "casebattle_session"
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30
