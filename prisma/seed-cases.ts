import "dotenv/config"
import { PrismaLibSql } from "@prisma/adapter-libsql"
import { PrismaClient, type Skin } from "../lib/generated/prisma/client"
import { slugify } from "../lib/db/slug"
import { resolveSqliteDatabaseUrl } from "../lib/db/sqlite-url"
import { isDisplayableImageUrl } from "../lib/images"

const DROP_WEIGHTS = [38, 24, 16, 10, 6, 3.5, 1.5, 1]

type CaseBlueprint = {
  name: string
  price: number
  minSkinPrice: number
  maxSkinPrice: number
  preferWeaponTypes?: string[]
}

const CASE_BLUEPRINTS: CaseBlueprint[] = [
  { name: "Стартовый", price: 99, minSkinPrice: 25, maxSkinPrice: 400 },
  { name: "Мираж", price: 149, minSkinPrice: 50, maxSkinPrice: 800 },
  { name: "Пыльный II", price: 199, minSkinPrice: 80, maxSkinPrice: 1200 },
  { name: "Инферно", price: 249, minSkinPrice: 100, maxSkinPrice: 1800 },
  { name: "Нюк", price: 299, minSkinPrice: 150, maxSkinPrice: 2500 },
  { name: "Вертиго", price: 349, minSkinPrice: 200, maxSkinPrice: 3500 },
  { name: "Оверпасс", price: 399, minSkinPrice: 250, maxSkinPrice: 4500 },
  { name: "Тренировка", price: 449, minSkinPrice: 300, maxSkinPrice: 5500 },
  { name: "Кобальт", price: 499, minSkinPrice: 350, maxSkinPrice: 6500 },
  { name: "Пистолетный", price: 599, minSkinPrice: 200, maxSkinPrice: 8000, preferWeaponTypes: ["pistol"] },
  { name: "AWP Vault", price: 699, minSkinPrice: 400, maxSkinPrice: 12000, preferWeaponTypes: ["awp"] },
  { name: "Винтовочный", price: 799, minSkinPrice: 500, maxSkinPrice: 15000, preferWeaponTypes: ["rifle"] },
  { name: "Премиум", price: 999, minSkinPrice: 800, maxSkinPrice: 25000 },
  { name: "Тайное", price: 1499, minSkinPrice: 2000, maxSkinPrice: 50000 },
  { name: "Легенда", price: 2499, minSkinPrice: 5000, maxSkinPrice: 250000 },
]

function pickCaseSkins(pool: Skin[], blueprint: CaseBlueprint): Skin[] {
  const filtered = pool.filter(
    (skin) =>
      skin.price >= blueprint.minSkinPrice &&
      skin.price <= blueprint.maxSkinPrice &&
      isDisplayableImageUrl(skin.image)
  )

  const preferred = blueprint.preferWeaponTypes?.length
    ? filtered.filter((skin) => blueprint.preferWeaponTypes!.includes(skin.weaponType))
    : filtered

  const source = preferred.length >= 8 ? preferred : filtered
  const sorted = [...source].sort((a, b) => a.price - b.price)

  if (sorted.length < 8) {
    return sorted
  }

  const picked: Skin[] = []
  const used = new Set<string>()

  const step = Math.max(1, Math.floor(sorted.length / 8))
  for (let i = 0; i < sorted.length && picked.length < 8; i += step) {
    const skin = sorted[i]
    if (!used.has(skin.id)) {
      picked.push(skin)
      used.add(skin.id)
    }
  }

  for (const skin of sorted) {
    if (picked.length >= 8) break
    if (!used.has(skin.id)) {
      picked.push(skin)
      used.add(skin.id)
    }
  }

  return picked.slice(0, 8)
}

function buildDropChances(count: number): number[] {
  const weights = DROP_WEIGHTS.slice(0, count)
  const sum = weights.reduce((a, b) => a + b, 0)
  return weights.map((w) => Math.round((w / sum) * 10000) / 100)
}

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaLibSql({ url: resolveSqliteDatabaseUrl() }),
  })

  const pool = await prisma.skin.findMany({
    where: {
      externalId: { not: null },
      image: { startsWith: "http" },
    },
    orderBy: { price: "asc" },
  })

  if (pool.length < 100) {
    throw new Error("Сначала выполните npm run db:seed-skins (мало скинов в базе)")
  }

  let created = 0
  let skipped = 0

  for (const blueprint of CASE_BLUEPRINTS) {
    const skins = pickCaseSkins(pool, blueprint)
    if (skins.length < 4) {
      console.warn(`Пропуск «${blueprint.name}»: мало скинов в диапазоне цен`)
      skipped += 1
      continue
    }

    const chances = buildDropChances(skins.length)
    const coverSkin = skins[skins.length - 1]
    const slug = slugify(blueprint.name)

    const existing = await prisma.case.findUnique({ where: { slug } })
    if (existing) {
      await prisma.caseItem.deleteMany({ where: { caseId: existing.id } })
      await prisma.case.update({
        where: { id: existing.id },
        data: {
          name: blueprint.name,
          price: blueprint.price,
          image: coverSkin.image,
          isActive: true,
          items: {
            create: skins.map((skin, index) => ({
              skinId: skin.id,
              dropChance: chances[index] ?? chances[chances.length - 1],
            })),
          },
        },
      })
      console.log(`Обновлён: ${blueprint.name} (${skins.length} скинов)`)
    } else {
      await prisma.case.create({
        data: {
          name: blueprint.name,
          slug,
          price: blueprint.price,
          image: coverSkin.image,
          isActive: true,
          items: {
            create: skins.map((skin, index) => ({
              skinId: skin.id,
              dropChance: chances[index] ?? chances[chances.length - 1],
            })),
          },
        },
      })
      console.log(`Создан: ${blueprint.name} (${skins.length} скинов)`)
    }

    created += 1
  }

  const total = await prisma.case.count({ where: { isActive: true } })
  console.log(`\nГотово: ${created} кейсов из плана, пропущено ${skipped}, активных в базе: ${total}`)

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
