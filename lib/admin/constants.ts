import type { Rarity, WeaponType } from "@/lib/case-battle"

export const RARITIES: Rarity[] = [
  "consumer",
  "industrial",
  "milspec",
  "restricted",
  "classified",
  "covert",
  "gold",
]

export const WEAPON_TYPES: WeaponType[] = ["rifle", "pistol", "knife", "awp"]

export const PROMO_BONUS_TYPES = ["BALANCE", "DEPOSIT_PERCENT"] as const
export type PromoBonusType = (typeof PROMO_BONUS_TYPES)[number]

export const LUCK_MODIFIERS = [
  { value: 0.5, label: "Слив (0.5)" },
  { value: 1.0, label: "Дефолт (1.0)" },
  { value: 2.5, label: "Подкрутка (2.5)" },
] as const

export function inferWeaponTypeFromName(name: string): WeaponType {
  const lower = name.toLowerCase()
  if (lower.includes("нож") || lower.includes("knife") || lower.includes("перчат") || lower.includes("glove")) {
    return "knife"
  }
  if (lower.includes("awp")) {
    return "awp"
  }
  if (
    lower.includes("glock") ||
    lower.includes("usp") ||
    lower.includes("deagle") ||
    lower.includes("p250") ||
    lower.includes("пистолет")
  ) {
    return "pistol"
  }
  return "rifle"
}

export function validateDropChanceSum(items: { dropChance: number }[]): {
  valid: boolean
  total: number
} {
  const total = items.reduce((sum, item) => sum + Number(item.dropChance), 0)
  const valid = Math.abs(total - 100) < 0.01
  return { valid, total: Math.round(total * 100) / 100 }
}
