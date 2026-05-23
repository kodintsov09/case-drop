import "dotenv/config"
import { PrismaLibSql } from "@prisma/adapter-libsql"
import { PrismaClient } from "../lib/generated/prisma/client"
import type { Rarity, WeaponType } from "../lib/case-battle"
import { inferWeaponTypeFromName } from "../lib/admin/constants"
import { resolveSqliteDatabaseUrl } from "../lib/db/sqlite-url"

const CS2_SKINS_URL =
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json"

const BATCH_SIZE = 100

type ApiSkin = {
  id: string
  name: string
  image?: string
  rarity?: { id?: string; name?: string }
  weapon?: { id?: string; name?: string }
  category?: { id?: string; name?: string }
  paint_index?: string
}

const RARITY_MAP: Record<string, Rarity> = {
  rarity_common_weapon: "consumer",
  rarity_uncommon_weapon: "industrial",
  rarity_rare_weapon: "milspec",
  rarity_mythical_weapon: "restricted",
  rarity_legendary_weapon: "classified",
  rarity_ancient_weapon: "covert",
  rarity_ancient: "gold",
  rarity_contraband: "gold",
}

const RARITY_PRICE: Record<Rarity, [number, number]> = {
  consumer: [30, 120],
  industrial: [80, 350],
  milspec: [200, 900],
  restricted: [600, 2800],
  classified: [1800, 8500],
  covert: [8000, 45000],
  gold: [35000, 250000],
}

function mapRarity(rarityId?: string): Rarity {
  if (!rarityId) return "milspec"
  return RARITY_MAP[rarityId] ?? "milspec"
}

function inferWeaponType(skin: ApiSkin): WeaponType {
  const weaponId = skin.weapon?.id?.toLowerCase() ?? ""
  const categoryId = skin.category?.id?.toLowerCase() ?? ""
  const categoryName = skin.category?.name?.toLowerCase() ?? ""

  if (
    weaponId.includes("knife") ||
    weaponId.includes("bayonet") ||
    weaponId.includes("karambit") ||
    weaponId.includes("dagger") ||
    categoryId.includes("knife") ||
    categoryId.includes("glove") ||
    categoryName.includes("knife") ||
    categoryName.includes("glove")
  ) {
    return "knife"
  }

  if (weaponId === "weapon_awp" || skin.name.toLowerCase().includes("awp")) {
    return "awp"
  }

  if (
    categoryId.includes("pistol") ||
    categoryId.includes("smg") ||
    weaponId.includes("glock") ||
    weaponId.includes("usp") ||
    weaponId.includes("deagle") ||
    weaponId.includes("p250") ||
    weaponId.includes("tec9") ||
    weaponId.includes("fiveseven") ||
    weaponId.includes("elite") ||
    weaponId.includes("cz75") ||
    weaponId.includes("p2000") ||
    weaponId.includes("hkp2000")
  ) {
    return "pistol"
  }

  return inferWeaponTypeFromName(skin.name)
}

function estimatePrice(rarity: Rarity, externalId: string, paintIndex?: string): number {
  const [min, max] = RARITY_PRICE[rarity]
  const seed = `${externalId}:${paintIndex ?? ""}`
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  const span = max - min + 1
  return min + (hash % span)
}

async function fetchSkins(): Promise<ApiSkin[]> {
  console.log("Загрузка списка скинов CS2…")
  const response = await fetch(CS2_SKINS_URL)
  if (!response.ok) {
    throw new Error(`Не удалось загрузить skins.json: HTTP ${response.status}`)
  }
  const data = (await response.json()) as ApiSkin[]
  if (!Array.isArray(data)) {
    throw new Error("Некорректный формат ответа API")
  }
  return data
}

async function main() {
  const adapter = new PrismaLibSql({ url: resolveSqliteDatabaseUrl() })
  const prisma = new PrismaClient({ adapter })

  const apiSkins = await fetchSkins()
  const valid = apiSkins.filter((s) => s.id && s.name && s.image?.startsWith("http"))

  console.log(`Найдено ${valid.length} скинов с изображениями (из ${apiSkins.length})`)

  const beforeCount = await prisma.skin.count({ where: { externalId: { not: null } } })

  for (let offset = 0; offset < valid.length; offset += BATCH_SIZE) {
    const batch = valid.slice(offset, offset + BATCH_SIZE)

    await prisma.$transaction(
      batch.map((skin) => {
        const rarity = mapRarity(skin.rarity?.id)
        const weaponType = inferWeaponType(skin)
        const price = estimatePrice(rarity, skin.id, skin.paint_index)

        return prisma.skin.upsert({
          where: { externalId: skin.id },
          create: {
            externalId: skin.id,
            name: skin.name,
            image: skin.image!,
            rarity,
            weaponType,
            price,
          },
          update: {
            name: skin.name,
            image: skin.image!,
            rarity,
            weaponType,
            price,
          },
        })
      })
    )

    const done = Math.min(offset + BATCH_SIZE, valid.length)
    process.stdout.write(`\rИмпорт: ${done}/${valid.length}`)
  }

  const importedCount = await prisma.skin.count({ where: { externalId: { not: null } } })

  console.log("\nГотово.")
  console.log(`  Импортировано из API: ${valid.length}`)
  console.log(`  Было CS2-скинов в БД: ${beforeCount}`)
  console.log(`  Стало CS2-скинов в БД: ${importedCount}`)

  const total = await prisma.skin.count()
  console.log(`  Скинов в базе: ${total}`)

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
