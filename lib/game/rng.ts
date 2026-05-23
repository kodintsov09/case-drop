import type { CaseItem, Skin } from "@/lib/generated/prisma/client"

type CaseItemWithSkin = CaseItem & { skin: Skin }

export function pickSkinFromCase(
  items: CaseItemWithSkin[],
  luckModifier: number
): CaseItemWithSkin {
  if (items.length === 0) {
    throw new Error("Кейс пуст")
  }

  const modifier = Math.max(0.1, luckModifier)
  const weights = items.map((item) => ({
    item,
    weight: Math.max(0.01, item.dropChance * modifier),
  }))

  const total = weights.reduce((sum, entry) => sum + entry.weight, 0)
  let roll = Math.random() * total

  for (const entry of weights) {
    roll -= entry.weight
    if (roll <= 0) {
      return entry.item
    }
  }

  return weights[weights.length - 1].item
}

export type UpgradeRollResult = {
  success: boolean
  winChance: number
  /** 0° = 12 часов, по часовой; совпадает с зелёной дугой на UI */
  pointerStopDeg: number
}

function pickPointerStopDeg(success: boolean, zoneDeg: number): number {
  const margin = Math.min(8, Math.max(2, zoneDeg * 0.1))
  if (success) {
    const lo = margin
    const hi = Math.max(lo + 1, zoneDeg - margin)
    return lo + Math.random() * (hi - lo)
  }
  const lo = Math.min(359, zoneDeg + margin + 2)
  const hi = 360 - margin
  return lo + Math.random() * Math.max(1, hi - lo)
}

export function rollUpgrade(
  inputPrice: number,
  targetPrice: number,
  luckModifier: number
): UpgradeRollResult {
  const winChance = Math.min(
    95,
    Math.max(1, (inputPrice / targetPrice) * 100 * luckModifier)
  )
  const zoneDeg = (winChance / 100) * 360
  const baseChance = Math.min(95, Math.max(1, (inputPrice / targetPrice) * 100))
  const adjusted = Math.min(99, baseChance * Math.max(0.1, luckModifier))
  const success = Math.random() * 100 <= adjusted
  const pointerStopDeg = pickPointerStopDeg(success, zoneDeg)

  return {
    success,
    winChance: Math.round(winChance * 100) / 100,
    pointerStopDeg: Math.round(pointerStopDeg * 10) / 10,
  }
}

export function rollUpgradeSuccess(
  inputPrice: number,
  targetPrice: number,
  luckModifier: number
): boolean {
  return rollUpgrade(inputPrice, targetPrice, luckModifier).success
}

export function pickContractRewardSkin<T extends { price: number }>(
  skins: T[],
  totalValue: number
): T {
  if (skins.length === 0) {
    throw new Error("Нет скинов для награды контракта")
  }

  const minPrice = Math.floor(totalValue * 0.5)
  const maxPrice = Math.floor(totalValue * 3.5)

  const inRange = skins.filter(
    (skin) => skin.price >= minPrice && skin.price <= maxPrice
  )

  const pool = inRange.length > 0 ? inRange : skins

  return pool[Math.floor(Math.random() * pool.length)]
}
