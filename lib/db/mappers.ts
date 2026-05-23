import type { Case, CaseItem, Skin } from "@/lib/generated/prisma/client"
import type { CaseItem as FrontendCase, Rarity, Skin as FrontendSkin, WeaponType } from "@/lib/case-battle"
import { normalizeImageUrl } from "@/lib/images"

const CASE_COLORS = [
  "#ff9900",
  "#eb4b4b",
  "#8847ff",
  "#4b69ff",
  "#d32ce6",
  "#5e98d9",
  "#ffd700",
  "#00ff88",
]

const WEAPON_LABELS: Record<WeaponType, string> = {
  rifle: "Винтовка",
  pistol: "Пистолет",
  knife: "Нож",
  awp: "AWP",
}

const RARITIES: Rarity[] = [
  "consumer",
  "industrial",
  "milspec",
  "restricted",
  "classified",
  "covert",
  "gold",
]

const WEAPON_TYPES: WeaponType[] = ["rifle", "pistol", "knife", "awp"]

function parseRarity(value: string): Rarity {
  return RARITIES.includes(value as Rarity) ? (value as Rarity) : "milspec"
}

function parseWeaponType(value: string): WeaponType {
  return WEAPON_TYPES.includes(value as WeaponType) ? (value as WeaponType) : "rifle"
}

export function mapSkinToFrontend(skin: Skin): FrontendSkin {
  const weaponType = parseWeaponType(skin.weaponType)
  return {
    id: skin.id,
    name: skin.name,
    weapon: WEAPON_LABELS[weaponType],
    wear: "—",
    rarity: parseRarity(skin.rarity),
    price: skin.price,
    image: normalizeImageUrl(skin.image) ?? skin.image,
    weaponType,
  }
}

type CaseWithRelations = Case & {
  items: (CaseItem & { skin: Skin })[]
}

export function mapCaseToFrontend(caseRecord: CaseWithRelations, index = 0): FrontendCase {
  return {
    id: caseRecord.id,
    name: caseRecord.name,
    price: caseRecord.price,
    image: normalizeImageUrl(caseRecord.image) ?? caseRecord.image,
    color: CASE_COLORS[index % CASE_COLORS.length],
    skins: caseRecord.items.map((item) => mapSkinToFrontend(item.skin)),
  }
}
