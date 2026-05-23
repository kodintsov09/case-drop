import "dotenv/config"
import { PrismaLibSql } from "@prisma/adapter-libsql"
import { PrismaClient } from "../lib/generated/prisma/client"
import { resolveSqliteDatabaseUrl } from "../lib/db/sqlite-url"

const adapter = new PrismaLibSql({ url: resolveSqliteDatabaseUrl() })
const prisma = new PrismaClient({ adapter })

async function main() {
  await prisma.user.upsert({
    where: { username: "konstantin" },
    update: {
      displayName: "Konstantin (Admin)",
      role: "admin",
      balance: 5000,
      luckModifier: 1.0,
    },
    create: {
      username: "konstantin",
      displayName: "Konstantin (Admin)",
      role: "admin",
      balance: 5000,
      luckModifier: 1.0,
      avatar: "https://i.pravatar.cc/80?img=12",
    },
  })

  console.log("Seed: тестовый пользователь Konstantin (Admin) готов")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
