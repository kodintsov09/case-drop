"use client"

import { useState, useCallback, useRef } from "react"

// Types
export type Rarity = "consumer" | "industrial" | "milspec" | "restricted" | "classified" | "covert" | "gold"
export type WeaponType = "rifle" | "pistol" | "knife" | "awp"

export interface Skin {
  id: string
  name: string
  weapon: string
  wear: string
  rarity: Rarity
  price: number
  image: string
  weaponType: WeaponType
}

export interface CaseItem {
  id: string
  name: string
  price: number
  image: string
  color: string
  skins: Skin[]
}

export interface Winner {
  id: string
  username: string
  avatar: string
  skin: Skin
  timestamp: number
}

// Rarity colors and labels
export const rarityConfig: Record<Rarity, { color: string; glow: string; label: string; border: string }> = {
  consumer: { 
    color: "#b0c3d9", 
    glow: "rgba(176, 195, 217, 0.3)",
    label: "Ширпотреб",
    border: "border-[#b0c3d9]"
  },
  industrial: { 
    color: "#5e98d9", 
    glow: "rgba(94, 152, 217, 0.3)",
    label: "Промышленное",
    border: "border-[#5e98d9]"
  },
  milspec: { 
    color: "#4b69ff", 
    glow: "rgba(75, 105, 255, 0.4)",
    label: "Армейское",
    border: "border-[#4b69ff]"
  },
  restricted: { 
    color: "#8847ff", 
    glow: "rgba(136, 71, 255, 0.4)",
    label: "Запрещённое",
    border: "border-[#8847ff]"
  },
  classified: { 
    color: "#d32ce6", 
    glow: "rgba(211, 44, 230, 0.4)",
    label: "Засекреченное",
    border: "border-[#d32ce6]"
  },
  covert: { 
    color: "#eb4b4b", 
    glow: "rgba(235, 75, 75, 0.5)",
    label: "Тайное",
    border: "border-[#eb4b4b]"
  },
  gold: { 
    color: "#ffd700", 
    glow: "rgba(255, 215, 0, 0.5)",
    label: "Редкое",
    border: "border-[#ffd700]"
  },
}

// Mock data with placeholder markers (will be rendered as SVG components)
export const mockSkins: Skin[] = [
  { id: "1", name: "Неоновая революция", weapon: "AK-47", wear: "Прямо с завода", rarity: "covert", price: 15000, image: "placeholder", weaponType: "rifle" },
  { id: "2", name: "Вой", weapon: "M4A4", wear: "Немного поношенное", rarity: "covert", price: 85000, image: "placeholder", weaponType: "rifle" },
  { id: "3", name: "Лор дракона", weapon: "AWP", wear: "Прямо с завода", rarity: "covert", price: 120000, image: "placeholder", weaponType: "awp" },
  { id: "4", name: "Градиент", weapon: "★ Нож-бабочка", wear: "Прямо с завода", rarity: "gold", price: 250000, image: "placeholder", weaponType: "knife" },
  { id: "5", name: "Градиент", weapon: "Glock-18", wear: "Прямо с завода", rarity: "restricted", price: 3500, image: "placeholder", weaponType: "pistol" },
  { id: "6", name: "Убийство подтверждено", weapon: "USP-S", wear: "Поношенное", rarity: "classified", price: 8500, image: "placeholder", weaponType: "pistol" },
  { id: "7", name: "Пламя", weapon: "Desert Eagle", wear: "Прямо с завода", rarity: "restricted", price: 12000, image: "placeholder", weaponType: "pistol" },
  { id: "8", name: "Огненный змей", weapon: "AK-47", wear: "После полевых", rarity: "covert", price: 45000, image: "placeholder", weaponType: "rifle" },
  { id: "9", name: "Гиперзверь", weapon: "M4A1-S", wear: "Прямо с завода", rarity: "classified", price: 6500, image: "placeholder", weaponType: "rifle" },
  { id: "10", name: "Азимов", weapon: "AWP", wear: "Немного поношенное", rarity: "classified", price: 22000, image: "placeholder", weaponType: "awp" },
  { id: "11", name: "Вулкан", weapon: "AK-47", wear: "Прямо с завода", rarity: "classified", price: 9500, image: "placeholder", weaponType: "rifle" },
  { id: "12", name: "Электрический улей", weapon: "AWP", wear: "После полевых", rarity: "milspec", price: 450, image: "placeholder", weaponType: "awp" },
]

// Case accent colors for variety
const caseColors = ["#ff9900", "#eb4b4b", "#8847ff", "#4b69ff", "#d32ce6", "#5e98d9", "#ffd700", "#00ff88"]

export const mockCases: CaseItem[] = [
  { id: "1", name: "Мираж", price: 150, image: "placeholder", color: caseColors[0], skins: mockSkins.slice(0, 8) },
  { id: "2", name: "Инферно", price: 250, image: "placeholder", color: caseColors[1], skins: mockSkins.slice(2, 10) },
  { id: "3", name: "Даст 2", price: 350, image: "placeholder", color: caseColors[2], skins: mockSkins },
  { id: "4", name: "Нюк", price: 500, image: "placeholder", color: caseColors[3], skins: mockSkins },
  { id: "5", name: "Вертиго", price: 199, image: "placeholder", color: caseColors[4], skins: mockSkins.slice(1, 9) },
  { id: "6", name: "Овер-Пасс", price: 450, image: "placeholder", color: caseColors[5], skins: mockSkins.slice(3, 11) },
  { id: "7", name: "Тренировка", price: 99, image: "placeholder", color: caseColors[6], skins: mockSkins.slice(5, 12) },
  { id: "8", name: "Кобальт", price: 750, image: "placeholder", color: caseColors[7], skins: mockSkins },
]

const usernames = ["xXHeadshotXx", "ProSniper99", "CaseKing", "LuckyShot", "SkinMaster", "CS_Legend", "NikoStyle", "S1mpleFan", "Флексер", "МастерКейсов"]

export const generateMockWinners = (): Winner[] => {
  const winners: Winner[] = []
  for (let i = 0; i < 20; i++) {
    const skin = mockSkins[Math.floor(Math.random() * mockSkins.length)]
    winners.push({
      id: `winner-${i}`,
      username: usernames[Math.floor(Math.random() * usernames.length)],
      avatar: `https://i.pravatar.cc/40?img=${i + 1}`,
      skin,
      timestamp: Date.now() - Math.random() * 300000,
    })
  }
  return winners
}

// Custom hooks
export function useBalance(initial: number = 5000) {
  const [balance, setBalance] = useState(initial)
  
  const deduct = useCallback((amount: number) => {
    setBalance(prev => Math.max(0, prev - amount))
  }, [])
  
  const add = useCallback((amount: number) => {
    setBalance(prev => prev + amount)
  }, [])
  
  return { balance, deduct, add, setBalance }
}

export const ROULETTE_ITEM_WIDTH = 140
export const ROULETTE_ITEM_GAP = 4
export const ROULETTE_ITEM_STEP = ROULETTE_ITEM_WIDTH + ROULETTE_ITEM_GAP
export const ROULETTE_SPIN_MS = 6200

/** Лента рулетки с выигрышным скином в фиксированной ячейке (совпадает с сервером). */
export function buildRouletteTape(
  pool: Skin[],
  winningSkin: Skin,
  loops = 6
): { tape: Skin[]; winIndex: number } {
  if (pool.length === 0) {
    return { tape: [winningSkin], winIndex: 0 }
  }

  const winIndex = pool.length * loops + Math.floor(pool.length / 2)
  const total = pool.length * (loops + 2)
  const tape: Skin[] = []

  for (let i = 0; i < total; i++) {
    if (i === winIndex) {
      tape.push(winningSkin)
    } else {
      tape.push(pool[Math.floor(Math.random() * pool.length)])
    }
  }

  return { tape, winIndex }
}

function scrollTapeToWinIndex(
  tapeEl: HTMLDivElement,
  viewportEl: HTMLElement | null,
  winIndex: number
) {
  const viewportWidth = viewportEl?.clientWidth ?? window.innerWidth
  const targetPosition =
    winIndex * ROULETTE_ITEM_STEP - viewportWidth / 2 + ROULETTE_ITEM_WIDTH / 2

  tapeEl.style.transition = "none"
  tapeEl.style.transform = "translateX(0)"

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      tapeEl.style.transition = `transform ${ROULETTE_SPIN_MS}ms cubic-bezier(0.15, 0.85, 0.25, 1)`
      tapeEl.style.transform = `translateX(-${Math.max(0, targetPosition)}px)`
    })
  })
}

export function useRouletteAnimation() {
  const [isSpinning, setIsSpinning] = useState(false)
  const [wonSkin, setWonSkin] = useState<Skin | null>(null)
  const [showResult, setShowResult] = useState(false)
  const tapeRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const isSpinningRef = useRef(false)

  const spin = useCallback(
    (
      tape: Skin[],
      winIndex: number,
      winningSkin: Skin,
      onComplete: (skin: Skin) => void
    ) => {
      if (isSpinningRef.current || tape.length === 0) return

      isSpinningRef.current = true
      setIsSpinning(true)
      setShowResult(false)
      setWonSkin(null)

      const safeIndex = Math.min(Math.max(0, winIndex), tape.length - 1)

      if (tapeRef.current) {
        scrollTapeToWinIndex(tapeRef.current, viewportRef.current, safeIndex)
      }

      window.setTimeout(() => {
        isSpinningRef.current = false
        setIsSpinning(false)
        setWonSkin(winningSkin)
        setShowResult(true)
        onComplete(winningSkin)
      }, ROULETTE_SPIN_MS)
    },
    []
  )

  const reset = useCallback(() => {
    setShowResult(false)
    setWonSkin(null)
    if (tapeRef.current) {
      tapeRef.current.style.transition = "none"
      tapeRef.current.style.transform = "translateX(0)"
    }
  }, [])

  return {
    isSpinning,
    wonSkin,
    showResult,
    tapeRef,
    viewportRef,
    spin,
    reset,
  }
}

// Utility functions
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU').format(price)
}

export function getRarityGlow(rarity: Rarity): string {
  const glows: Record<Rarity, string> = {
    consumer: "",
    industrial: "",
    milspec: "card-glow-milspec",
    restricted: "card-glow-restricted", 
    classified: "card-glow-classified",
    covert: "card-glow-covert",
    gold: "card-glow-gold",
  }
  return glows[rarity]
}
