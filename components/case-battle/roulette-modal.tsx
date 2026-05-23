"use client"

import { useEffect, useMemo, useCallback, useState } from "react"
import { X } from "lucide-react"
import {
  CaseItem,
  Skin,
  rarityConfig,
  formatPrice,
  buildRouletteTape,
  useRouletteAnimation,
  getRarityGlow,
} from "@/lib/case-battle"
import type { InventorySkin } from "@/lib/game/inventory"
import type { PublicUser } from "@/lib/auth/types"
import { CasePlaceholder } from "./svg-placeholders"
import { RemoteImage } from "./remote-image"
import { SkinCardImage } from "./skin-card-image"

interface RouletteModalProps {
  caseItem: CaseItem
  isOpen: boolean
  onClose: () => void
  balance: number
  onUserUpdate: (user: PublicUser) => void
  onRefreshInventory: () => void
}

export function RouletteModal({
  caseItem,
  isOpen,
  onClose,
  balance,
  onUserUpdate,
  onRefreshInventory,
}: RouletteModalProps) {
  const { isSpinning, wonSkin, showResult, tapeRef, viewportRef, spin, reset } =
    useRouletteAnimation()
  const [tapeItems, setTapeItems] = useState<Skin[]>([])
  const [canAfford, setCanAfford] = useState(true)
  const [pendingInventoryItem, setPendingInventoryItem] = useState<InventorySkin | null>(
    null
  )
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setCanAfford(balance >= caseItem.price)
  }, [balance, caseItem.price])

  const idleTape = useMemo(() => {
    const items: Skin[] = []
    for (let i = 0; i < 6; i++) {
      items.push(...caseItem.skins)
    }
    return items
  }, [caseItem.skins])

  const displayTape = tapeItems.length > 0 ? tapeItems : idleTape

  const handleSpin = useCallback(async () => {
    if (isSpinning || opening) return

    if (caseItem.skins.length === 0) {
      setError("В кейсе нет скинов — добавьте их в админке")
      return
    }

    if (!canAfford) {
      setError("Недостаточно средств на балансе")
      return
    }

    setOpening(true)
    setError(null)

    try {
      const response = await fetch("/api/cases/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: caseItem.id }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? "Не удалось открыть кейс")
      }

      if (data.user) onUserUpdate(data.user)
      setPendingInventoryItem(data.inventoryItem)

      const { tape, winIndex } = buildRouletteTape(caseItem.skins, data.skin)
      setTapeItems(tape)

      requestAnimationFrame(() => {
        spin(tape, winIndex, data.skin, () => {
          onRefreshInventory()
        })
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка открытия")
    } finally {
      setOpening(false)
    }
  }, [
    isSpinning,
    canAfford,
    opening,
    caseItem.id,
    caseItem.skins,
    onUserUpdate,
    onRefreshInventory,
    spin,
  ])

  const handleSell = useCallback(async () => {
    if (!pendingInventoryItem) return

    try {
      const response = await fetch(
        `/api/inventory/${pendingInventoryItem.inventoryItemId}/sell`,
        { method: "POST" }
      )
      const data = await response.json()
      if (data.user) onUserUpdate(data.user)
      onRefreshInventory()
    } catch {
      setError("Не удалось продать предмет")
    }

    reset()
    setPendingInventoryItem(null)
    onClose()
  }, [pendingInventoryItem, onUserUpdate, onRefreshInventory, reset, onClose])

  const handleToInventory = useCallback(() => {
    reset()
    setPendingInventoryItem(null)
    onRefreshInventory()
    onClose()
  }, [reset, onRefreshInventory, onClose])

  const handleClose = useCallback(() => {
    if (!isSpinning && !opening) {
      reset()
      setTapeItems([])
      setPendingInventoryItem(null)
      onClose()
    }
  }, [isSpinning, opening, reset, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative z-10 w-full max-w-4xl rounded-xl border border-border/50 bg-[#0d0f13] p-4 shadow-2xl">
        <button
          onClick={handleClose}
          disabled={isSpinning || opening}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-[#1a1d24] hover:text-white disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="h-12 w-12">
            <RemoteImage
              src={caseItem.image}
              alt={caseItem.name}
              className="h-full w-full object-contain"
              fallback={
                <CasePlaceholder className="h-full w-full" color={caseItem.color} />
              }
            />
          </div>
          <div>
            <h2 className="text-lg font-bold">{caseItem.name}</h2>
            <p className="text-xs text-muted-foreground">
              {caseItem.skins.length} возможных скинов · шансы из админки
            </p>
          </div>
        </div>

        {error && (
          <p className="mb-3 rounded border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        <div
          ref={viewportRef}
          className="relative mb-4 overflow-hidden rounded-lg border border-border/30 bg-[#0a0c10]"
        >
          <div className="pointer-events-none absolute left-1/2 top-0 z-20 h-full w-[2px] -translate-x-1/2">
            <div
              className="h-full w-full"
              style={{
                background:
                  "linear-gradient(180deg, #ff9900 0%, #ff5500 50%, #ff9900 100%)",
                boxShadow: "0 0 20px rgba(255, 153, 0, 0.8)",
              }}
            />
          </div>

          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-[#0a0c10] to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-[#0a0c10] to-transparent" />

          <div className="py-4">
            <div ref={tapeRef} className="flex gap-1" style={{ willChange: "transform" }}>
              {displayTape.map((skin, index) => (
                <div
                  key={`${skin.id}-${index}`}
                  className={`shrink-0 rounded border border-border/30 bg-[#12151a] p-2 ${getRarityGlow(skin.rarity)}`}
                  style={{
                    width: "140px",
                    borderBottomColor: rarityConfig[skin.rarity].color,
                    borderBottomWidth: "3px",
                  }}
                >
                  <div
                    className="relative mb-1 flex h-20 items-center justify-center"
                    style={{
                      background: `radial-gradient(ellipse at center, ${rarityConfig[skin.rarity].glow} 0%, transparent 70%)`,
                    }}
                  >
                    <SkinCardImage
                      skin={skin}
                      color={rarityConfig[skin.rarity].color}
                    />
                  </div>
                  <div className="text-center">
                    <p className="truncate text-[10px] text-muted-foreground">
                      {skin.weapon}
                    </p>
                    <p className="truncate text-xs font-medium">{skin.name}</p>
                    <p
                      className="text-xs font-bold"
                      style={{ color: rarityConfig[skin.rarity].color }}
                    >
                      {formatPrice(skin.price)} ₽
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {showResult && wonSkin && (
          <div className="absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-black/90">
            <div className="text-center">
              <div
                className={`mx-auto mb-4 rounded-xl border-2 bg-[#12151a] p-6 ${getRarityGlow(wonSkin.rarity)}`}
                style={{ borderColor: rarityConfig[wonSkin.rarity].color }}
              >
                <div
                  className="relative mx-auto mb-4 flex h-40 w-48 items-center justify-center"
                  style={{
                    background: `radial-gradient(ellipse at center, ${rarityConfig[wonSkin.rarity].glow} 0%, transparent 70%)`,
                  }}
                >
                  <SkinCardImage
                    skin={wonSkin}
                    className="h-full w-full"
                    color={rarityConfig[wonSkin.rarity].color}
                  />
                </div>
                <p className="text-sm text-muted-foreground">{wonSkin.weapon}</p>
                <p className="text-xl font-bold">{wonSkin.name}</p>
                <p
                  className="mt-2 text-2xl font-black"
                  style={{ color: rarityConfig[wonSkin.rarity].color }}
                >
                  {formatPrice(wonSkin.price)} ₽
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSell}
                  className="rounded-lg border border-border/50 bg-[#1a1d24] px-6 py-3 font-bold transition-all hover:bg-[#252830]"
                >
                  Продать за {formatPrice(Math.floor(wonSkin.price * 0.9))} ₽
                </button>
                <button
                  onClick={handleToInventory}
                  className="rounded-lg px-6 py-3 font-bold text-black transition-all hover:scale-105"
                  style={{
                    background: "linear-gradient(135deg, #ff9900 0%, #ff5500 100%)",
                  }}
                >
                  В инвентарь
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {caseItem.skins.slice(0, 6).map((skin) => (
              <div
                key={skin.id}
                className="h-1.5 w-4 rounded-full"
                style={{ backgroundColor: rarityConfig[skin.rarity].color }}
              />
            ))}
          </div>

          <button
            onClick={handleSpin}
            disabled={
              isSpinning ||
              opening ||
              !canAfford ||
              caseItem.skins.length === 0
            }
            className="relative overflow-hidden rounded-lg px-8 py-3 font-black text-black transition-all hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-50"
            style={{
              background: canAfford
                ? "linear-gradient(135deg, #ff9900 0%, #ff5500 100%)"
                : "#333",
            }}
          >
            {isSpinning || opening ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                {opening ? "ПОДГОТОВКА..." : "ОТКРЫВАЕМ..."}
              </span>
            ) : canAfford ? (
              `ОТКРЫТЬ КЕЙС — ${formatPrice(caseItem.price)} ₽`
            ) : (
              "НЕДОСТАТОЧНО СРЕДСТВ"
            )}
          </button>

          <div className="text-right">
            <p className="text-xs text-muted-foreground">Ваш баланс</p>
            <p className="text-lg font-bold" style={{ color: "#ffd700" }}>
              {formatPrice(balance)} ₽
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
