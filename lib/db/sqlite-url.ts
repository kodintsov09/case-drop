import path from "node:path"

/** Абсолютный file:-URL для локальной SQLite (libSQL / Prisma). */
export function resolveSqliteDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL ?? "file:./dev.db"

  if (!raw.startsWith("file:")) {
    return raw
  }

  const filePath = raw.replace(/^file:(\.\/)?/, "")
  const absolute = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath)

  return `file:${absolute.replace(/\\/g, "/")}`
}
