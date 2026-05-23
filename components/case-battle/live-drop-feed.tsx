"use client"

import { useCallback, useEffect, useState } from "react"
import { Winner, rarityConfig, formatPrice } from "@/lib/case-battle"
import { SkinCardImage } from "./skin-card-image"

export function LiveDropFeed() {
  const [winners, setWinners] = useState<Winner[]>([])

  const loadDrops = useCallback(async () => {
    try {
      const response = await fetch("/api/live-drops?limit=25", { cache: "no-store" })
      const data = await response.json()
      if (response.ok) {
        setWinners(data)
      }
    } catch {
      // keep previous
    }
  }, [])

  useEffect(() => {
    loadDrops()
    const interval = setInterval(loadDrops, 4000)
    return () => clearInterval(interval)
  }, [loadDrops])

  const displayWinners = winners.length > 0 ? [...winners, ...winners] : []

  if (displayWinners.length === 0) {
    return (
      <div className="border-b border-border/30 bg-[#0a0c10] px-4 py-3 text-center text-xs text-muted-foreground">
        Лента дропов — откройте кейс, чтобы появились реальные выигрыши
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden border-b border-border/30 bg-[#0a0c10]">
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 bg-gradient-to-r from-[#0a0c10] to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-[#0a0c10] to-transparent" />

      <div className="py-2">
        <div className="animate-ticker flex gap-2">
          {displayWinners.map((winner, index) => (
            <div
              key={`${winner.id}-${index}`}
              className="group relative flex shrink-0 items-center gap-2 rounded border border-border/30 bg-[#12151a] px-2 py-1.5 transition-all hover:border-border/60"
              style={{
                borderBottomColor: rarityConfig[winner.skin.rarity].color,
                borderBottomWidth: "2px",
              }}
            >
              <img
                src={winner.avatar}
                alt={winner.username}
                className="h-5 w-5 rounded-full object-cover"
              />

              <div
                className="relative h-8 w-12 overflow-hidden rounded"
                style={{
                  background: `radial-gradient(ellipse at center, ${rarityConfig[winner.skin.rarity].glow} 0%, transparent 70%)`,
                }}
              >
                <SkinCardImage
                  skin={winner.skin}
                  color={rarityConfig[winner.skin.rarity].color}
                />
              </div>

              <div className="flex flex-col">
                <span className="max-w-[80px] truncate text-[10px] font-medium leading-tight">
                  {winner.skin.weapon}
                </span>
                <span
                  className="text-[10px] font-bold"
                  style={{ color: rarityConfig[winner.skin.rarity].color }}
                >
                  {formatPrice(winner.skin.price)} ₽
                </span>
              </div>

              <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/90 px-2 py-1 text-[10px] opacity-0 transition-opacity group-hover:opacity-100">
                {winner.username}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
