"use client"

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { ChevronUp, Sparkles, X } from "lucide-react"
import { rarityColors, WeaponPlaceholder } from "./svg-placeholders"
import { SkinCardImage } from "./skin-card-image"
import { Skin, formatPrice } from "@/lib/case-battle"
import type { InventorySkin } from "@/lib/game/inventory"
import type { PublicUser } from "@/lib/auth/types"

interface UpgradesViewProps {
  inventory: InventorySkin[]
  inventoryLoading?: boolean
  inventoryError?: string | null
  onRefreshInventory: () => void
  onUserUpdate: (user: PublicUser) => void
}

export function UpgradesView({
  inventory,
  inventoryLoading = false,
  inventoryError = null,
  onRefreshInventory,
  onUserUpdate,
}: UpgradesViewProps) {
  const [upgradeTargets, setUpgradeTargets] = useState<Skin[]>([])
  const [targetsLoading, setTargetsLoading] = useState(false)
  const [selectedUserItem, setSelectedUserItem] = useState<InventorySkin | null>(null)
  const [selectedTarget, setSelectedTarget] = useState<Skin | null>(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [pointerAngle, setPointerAngle] = useState(0)
  const [result, setResult] = useState<"success" | "fail" | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [upgradeError, setUpgradeError] = useState<string | null>(null)
  const animationRef = useRef<number | null>(null)

  const fireworkSpots = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        left: (i * 17 + 13) % 100,
        top: (i * 23 + 7) % 100,
        delay: (i % 5) * 0.1,
      })),
    []
  )

  useEffect(() => {
    if (!selectedUserItem) {
      setUpgradeTargets([])
      return
    }

    setTargetsLoading(true)
    fetch(`/api/upgrades/targets?minPrice=${selectedUserItem.price}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error ?? "Не удалось загрузить цели")
        }
        if (Array.isArray(data)) setUpgradeTargets(data)
      })
      .catch((err) => {
        setUpgradeTargets([])
        setUpgradeError(
          err instanceof Error ? err.message : "Не удалось загрузить цели"
        )
      })
      .finally(() => setTargetsLoading(false))
  }, [selectedUserItem])

  const availableUpgrades = useMemo(() => {
    if (!selectedUserItem) return upgradeTargets
    return upgradeTargets
      .filter((skin) => skin.price > selectedUserItem.price)
      .sort((a, b) => a.price - b.price)
  }, [selectedUserItem, upgradeTargets])

  const winChance = selectedUserItem && selectedTarget
    ? Math.min(95, Math.max(1, (selectedUserItem.price / selectedTarget.price) * 100))
    : 0

  // Win zone in degrees (starting from top/12 o'clock, going clockwise)
  const winZoneDegrees = (winChance / 100) * 360

  // Quick chance button handler - finds skin closest to target price
  const handleQuickChance = useCallback((targetChance: number) => {
    if (!selectedUserItem) return
    
    // Calculate target price: userPrice / (chance/100) = targetPrice
    const targetPrice = selectedUserItem.price / (targetChance / 100)
    
    // Find skin closest to this price
    const validSkins = upgradeTargets.filter((s) => s.price > selectedUserItem.price)
    if (validSkins.length === 0) return
    
    let closestSkin = validSkins[0]
    let closestDiff = Math.abs(validSkins[0].price - targetPrice)
    
    for (const skin of validSkins) {
      const diff = Math.abs(skin.price - targetPrice)
      if (diff < closestDiff) {
        closestDiff = diff
        closestSkin = skin
      }
    }
    
    setSelectedTarget(closestSkin)
  }, [selectedUserItem, upgradeTargets])

  const handleUpgrade = useCallback(async () => {
    if (!selectedUserItem || !selectedTarget || isSpinning) return

    setIsSpinning(true)
    setResult(null)
    setShowResult(false)
    setUpgradeError(null)

    let isWin = false

    try {
      const response = await fetch("/api/upgrades/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryItemId: selectedUserItem.inventoryItemId,
          targetSkinId: selectedTarget.id,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error ?? "Ошибка апгрейда")
      }
      isWin = Boolean(data.success)
      if (data.user) onUserUpdate(data.user)
      onRefreshInventory()
    } catch (err) {
      setIsSpinning(false)
      setUpgradeError(err instanceof Error ? err.message : "Ошибка апгрейда")
      return
    }

    // Animate the orange pointer spinning around the wheel
    const startTime = Date.now()
    const duration = 4000
    const startAngle = pointerAngle
    const totalRotations = 5 + Math.random() * 3
    
    // Calculate final angle based on win/lose
    // Win zone is from 0 to winZoneDegrees (starting at 12 o'clock)
    // If win: land between 0 and winZoneDegrees
    // If lose: land between winZoneDegrees and 360
    let finalAngleInZone: number
    if (isWin) {
      // Land in win zone (0 to winZoneDegrees), with some margin from edges
      finalAngleInZone = 5 + Math.random() * (winZoneDegrees - 10)
    } else {
      // Land in lose zone (winZoneDegrees to 360), with some margin
      finalAngleInZone = winZoneDegrees + 5 + Math.random() * (360 - winZoneDegrees - 10)
    }
    
    const targetAngle = startAngle + (totalRotations * 360) + finalAngleInZone

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Cubic ease out for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3)
      const currentAngle = startAngle + (targetAngle - startAngle) * eased

      setPointerAngle(currentAngle)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setIsSpinning(false)
        setResult(isWin ? "success" : "fail")
        setShowResult(true)
      }
    }

    animationRef.current = requestAnimationFrame(animate)
  }, [
    selectedUserItem,
    selectedTarget,
    isSpinning,
    winChance,
    winZoneDegrees,
    pointerAngle,
    onRefreshInventory,
    onUserUpdate,
  ])

  const resetUpgrade = useCallback(() => {
    setSelectedUserItem(null)
    setSelectedTarget(null)
    setResult(null)
    setShowResult(false)
  }, [])

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  // SVG arc calculation for the monolithic solid ring (smaller, denser)
  const radius = 85
  const strokeWidth = 18
  const circumference = 2 * Math.PI * radius
  const winArcLength = (winChance / 100) * circumference
  
  // State for hover glow on quick chance buttons
  const [hoveredChanceBtn, setHoveredChanceBtn] = useState<number | null>(null)

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-6">
      {(upgradeError || inventoryError) && (
        <p className="mb-4 rounded border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {upgradeError ?? inventoryError}
        </p>
      )}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto_1fr]">
        {/* Left: User Inventory */}
        <div className="rounded-xl border border-border/50 bg-[#0d0f13]/80 p-4">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
            <span className="h-1 w-4 rounded bg-gradient-to-r from-orange-500 to-orange-600" />
            Ваш инвентарь
          </h2>
          <div className="grid max-h-[500px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
            {inventoryLoading ? (
              <p className="col-span-full text-center text-sm text-muted-foreground">
                Загрузка инвентаря...
              </p>
            ) : inventory.length === 0 ? (
              <p className="col-span-full text-center text-sm text-muted-foreground">
                {inventoryError
                  ? inventoryError
                  : "Инвентарь пуст. Откройте кейсы во вкладке «Кейсы»!"}
              </p>
            ) : null}
            {inventory.map((item) => (
              <button
                key={item.inventoryItemId}
                onClick={() => {
                  setSelectedUserItem(item)
                  setSelectedTarget(null)
                  setUpgradeError(null)
                }}
                disabled={isSpinning}
                className={`group relative flex flex-col items-center rounded-lg border p-2 transition-all ${
                  selectedUserItem?.inventoryItemId === item.inventoryItemId
                    ? "border-orange-500 bg-orange-500/10"
                    : "border-border/30 bg-[#12151a] hover:border-border hover:bg-[#1a1d24]"
                }`}
              >
                <div className="relative mb-1 h-14 w-full">
                  <SkinCardImage
                    skin={item}
                    className="h-full w-full"
                    color={rarityColors[item.rarity as keyof typeof rarityColors]}
                  />
                </div>
                <div className="w-full text-center">
                  <p className="truncate text-[10px] text-muted-foreground">{item.weapon}</p>
                  <p className="truncate text-xs font-medium">{item.name}</p>
                  <p 
                    className="mt-0.5 text-xs font-bold"
                    style={{ color: rarityColors[item.rarity as keyof typeof rarityColors] }}
                  >
                    {formatPrice(item.price)} ₽
                  </p>
                </div>
                {selectedUserItem?.inventoryItemId === item.inventoryItemId && (
                  <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500">
                    <ChevronUp className="h-3 w-3 text-black" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Upgrade Wheel */}
        <div className="flex flex-col items-center justify-center py-4">
          {/* Quick chance buttons - above the wheel with hover glow */}
          {selectedUserItem && !isSpinning && (
            <div className="mb-4 flex items-center gap-2">
              {[20, 50, 70].map((chance) => (
                <button
                  key={chance}
                  onClick={() => handleQuickChance(chance)}
                  onMouseEnter={() => setHoveredChanceBtn(chance)}
                  onMouseLeave={() => setHoveredChanceBtn(null)}
                  className="rounded-lg border border-orange-500/50 bg-gradient-to-r from-orange-500/20 to-orange-600/20 px-4 py-2 text-sm font-bold text-orange-400 transition-all hover:border-orange-400 hover:bg-orange-500/30 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,153,0,0.4)] active:scale-95"
                >
                  {chance}%
                </button>
              ))}
            </div>
          )}

          {/* Wheel Frame with Cyberpunk Corners */}
          <div className="relative p-5">
            {/* Corner Brackets - Top Left */}
            <div className="absolute top-0 left-0 w-5 h-5">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-orange-500 to-transparent" />
              <div className="absolute top-0 left-0 h-full w-[2px] bg-gradient-to-b from-orange-500 to-transparent" />
              <div className="absolute top-1 left-1 w-1 h-1 rounded-full bg-orange-500/60" />
            </div>
            {/* Corner Brackets - Top Right */}
            <div className="absolute top-0 right-0 w-5 h-5">
              <div className="absolute top-0 right-0 w-full h-[2px] bg-gradient-to-l from-orange-500 to-transparent" />
              <div className="absolute top-0 right-0 h-full w-[2px] bg-gradient-to-b from-orange-500 to-transparent" />
              <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-orange-500/60" />
            </div>
            {/* Corner Brackets - Bottom Left */}
            <div className="absolute bottom-0 left-0 w-5 h-5">
              <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-orange-500 to-transparent" />
              <div className="absolute bottom-0 left-0 h-full w-[2px] bg-gradient-to-t from-orange-500 to-transparent" />
              <div className="absolute bottom-1 left-1 w-1 h-1 rounded-full bg-orange-500/60" />
            </div>
            {/* Corner Brackets - Bottom Right */}
            <div className="absolute bottom-0 right-0 w-5 h-5">
              <div className="absolute bottom-0 right-0 w-full h-[2px] bg-gradient-to-l from-orange-500 to-transparent" />
              <div className="absolute bottom-0 right-0 h-full w-[2px] bg-gradient-to-t from-orange-500 to-transparent" />
              <div className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-orange-500/60" />
            </div>

            {/* Circular Wheel Container - SMALLER SIZE */}
            <div 
              className="relative flex h-52 w-52 items-center justify-center sm:h-56 sm:w-56 transition-all duration-300"
              style={{
                boxShadow: hoveredChanceBtn ? '0 0 40px rgba(255, 153, 0, 0.25)' : 'none',
              }}
            >
              {/* Outer decorative neon ring */}
              <div 
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  border: '1px solid rgba(255, 153, 0, 0.25)',
                  boxShadow: '0 0 12px rgba(255, 153, 0, 0.15), inset 0 0 12px rgba(0, 0, 0, 0.4)',
                }}
              />
              
              {/* SVG Wheel - STATIC clean monolithic solid ring with tick marks */}
              <svg 
                className="absolute inset-0 h-full w-full" 
                viewBox="0 0 200 200"
              >
                <defs>
                  <filter id="greenGlow">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  <filter id="orangeGlow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                {/* Background ring (dark/fail zone) - single solid circle - STATIC */}
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke="#1f2328"
                  strokeWidth={strokeWidth}
                />
                
                {/* Win zone arc - SINGLE green arc from 12 o'clock clockwise - STATIC */}
                {winChance > 0 && (
                  <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${winArcLength} ${circumference}`}
                    strokeDashoffset={0}
                    strokeLinecap="butt"
                    filter="url(#greenGlow)"
                    transform="rotate(-90 100 100)"
                  />
                )}
                
                {/* Tick marks every 5% (20 ticks) like a radar/compass */}
                {[...Array(20)].map((_, i) => {
                  const tickAngle = (i * 18) - 90 // 5% = 18 degrees, start from 12 o'clock
                  const tickRadians = (tickAngle * Math.PI) / 180
                  const isMajor = i % 2 === 0 // Major tick every 10%
                  const innerR = radius + strokeWidth / 2 + 2
                  const outerR = innerR + (isMajor ? 5 : 3)
                  const x1 = 100 + innerR * Math.cos(tickRadians)
                  const y1 = 100 + innerR * Math.sin(tickRadians)
                  const x2 = 100 + outerR * Math.cos(tickRadians)
                  const y2 = 100 + outerR * Math.sin(tickRadians)
                  
                  // Check if tick is in win zone
                  const tickPercent = (i * 5)
                  const isInWinZone = tickPercent < winChance
                  
                  return (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={isInWinZone ? 'rgba(34, 197, 94, 0.5)' : 'rgba(255, 255, 255, 0.12)'}
                      strokeWidth={isMajor ? 1.5 : 0.75}
                    />
                  )
                })}
                
                {/* Inner decorative ring */}
                <circle
                  cx="100"
                  cy="100"
                  r={radius - strokeWidth / 2 - 3}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.04)"
                  strokeWidth={1}
                />
              </svg>

              {/* ROTATING Orange Pointer - spins around the wheel */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{ 
                  transform: `rotate(${pointerAngle}deg)`,
                  transformOrigin: 'center center',
                }}
              >
                {/* Pointer positioned at 12 o'clock (top), pointing inward */}
                <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '4px' }}>
                  {/* Orange triangle pointer pointing down into the wheel */}
                  <div 
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: '10px solid transparent',
                      borderRight: '10px solid transparent',
                      borderTop: '16px solid #ff9900',
                      filter: 'drop-shadow(0 0 8px rgba(255, 153, 0, 1))',
                    }}
                  />
                </div>
              </div>

              {/* Center content (static, doesn't rotate) - DETAILED */}
              <div className="relative z-10 flex flex-col items-center justify-center text-center">
                {selectedUserItem && selectedTarget ? (
                  <>
                    <span 
                      className={`text-2xl font-black sm:text-3xl ${winChance > 50 ? 'text-green-500' : 'text-orange-500'}`}
                    >
                      {winChance.toFixed(1)}%
                    </span>
                    <span className="mt-0.5 text-[10px] text-muted-foreground">шанс на успех</span>
                    {/* Price comparison */}
                    <span className="mt-1 text-[9px] font-medium text-white/50">
                      {formatPrice(selectedUserItem.price)} ₽ <span className="text-orange-400">VS</span> {formatPrice(selectedTarget.price)} ₽
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground px-3">
                    {selectedUserItem ? "Выберите скин для апгрейда" : "Выберите ваш предмет"}
                  </span>
                )}
              </div>

              {/* Selection indicators on the sides */}
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 sm:-left-5">
                {selectedUserItem ? (
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-[#12151a] shadow-lg">
                    <WeaponPlaceholder
                      className="h-8 w-8"
                      color={rarityColors[selectedUserItem.rarity as keyof typeof rarityColors]}
                      type={selectedUserItem.weaponType}
                    />
                  </div>
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-dashed border-border/50 bg-[#0d0f13]">
                    <span className="text-lg text-muted-foreground">?</span>
                  </div>
                )}
              </div>
              <div className="absolute -right-4 top-1/2 -translate-y-1/2 sm:-right-5">
                {selectedTarget ? (
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-[#12151a] shadow-lg">
                    <WeaponPlaceholder
                      className="h-8 w-8"
                      color={rarityColors[selectedTarget.rarity as keyof typeof rarityColors]}
                      type={selectedTarget.weaponType}
                    />
                  </div>
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-dashed border-border/50 bg-[#0d0f13]">
                    <span className="text-lg text-muted-foreground">?</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Upgrade Button */}
          <button
            onClick={handleUpgrade}
            disabled={!selectedUserItem || !selectedTarget || isSpinning}
            className={`mt-6 flex items-center gap-2 rounded-xl px-8 py-3 text-lg font-black uppercase tracking-wide transition-all ${
              !selectedUserItem || !selectedTarget || isSpinning
                ? "cursor-not-allowed bg-[#1a1d24] text-muted-foreground"
                : "animate-pulse-glow bg-gradient-to-r from-orange-500 to-orange-600 text-black hover:scale-105 active:scale-95"
            }`}
          >
            <Sparkles className="h-5 w-5" />
            {isSpinning ? "Крутится..." : "АПГРЕЙДИТЬ"}
          </button>
        </div>

        {/* Right: All Upgrade Skins */}
        <div className="rounded-xl border border-border/50 bg-[#0d0f13]/80 p-4">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
            <span className="h-1 w-4 rounded bg-gradient-to-r from-orange-500 to-orange-600" />
            Скин для апгрейда
            {selectedUserItem && (
              <span className="ml-auto text-xs text-muted-foreground">
                ({availableUpgrades.length} доступно)
              </span>
            )}
          </h2>
          <div className="grid max-h-[500px] grid-cols-2 gap-2 overflow-y-auto pr-1">
            {selectedUserItem && !targetsLoading && availableUpgrades.length === 0 && (
              <p className="col-span-full text-center text-sm text-muted-foreground">
                Нет скинов дороже выбранного. Выберите другой предмет из инвентаря.
              </p>
            )}
            {availableUpgrades.map((item) => {
              const itemChance = selectedUserItem 
                ? Math.min(95, Math.max(1, (selectedUserItem.price / item.price) * 100))
                : 0
              
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedTarget(item)}
                  disabled={isSpinning}
                  className={`group relative flex flex-col items-center rounded-lg border p-2 transition-all ${
                    selectedTarget?.id === item.id
                      ? "border-orange-500 bg-orange-500/10"
                      : "border-border/30 bg-[#12151a] hover:border-border hover:bg-[#1a1d24]"
                  }`}
                >
                  <div className="relative mb-1 h-14 w-full">
                    <SkinCardImage
                      skin={item}
                      className="h-full w-full"
                      color={rarityColors[item.rarity as keyof typeof rarityColors]}
                    />
                  </div>
                  <div className="w-full text-center">
                    <p className="truncate text-[10px] text-muted-foreground">{item.weapon}</p>
                    <p className="truncate text-xs font-medium">{item.name}</p>
                    <p
                      className="mt-0.5 text-xs font-bold"
                      style={{ color: rarityColors[item.rarity as keyof typeof rarityColors] }}
                    >
                      {formatPrice(item.price)} ₽
                    </p>
                    {selectedUserItem && (
                      <p
                        className={`mt-0.5 text-[10px] font-medium ${itemChance > 50 ? "text-green-400" : "text-orange-400"}`}
                      >
                        {itemChance.toFixed(1)}% шанс
                      </p>
                    )}
                  </div>
                  {selectedTarget?.id === item.id && (
                    <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500">
                      <ChevronUp className="h-3 w-3 rotate-180 text-black" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Result Modal */}
      {showResult && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div 
            className={`relative mx-4 w-full max-w-md rounded-2xl border p-8 text-center ${
              result === "success" 
                ? "border-green-500/50 bg-gradient-to-b from-green-900/30 to-[#0d0f13]" 
                : "border-red-500/50 bg-gradient-to-b from-red-900/30 to-[#0d0f13]"
            }`}
          >
            <button
              onClick={resetUpgrade}
              className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            {result === "success" ? (
              <>
                {/* Fireworks effect - pointer-events-none so it doesn't block clicks */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                  {fireworkSpots.map((spot, i) => (
                    <div
                      key={i}
                      className="absolute h-2 w-2 rounded-full bg-yellow-400 animate-ping"
                      style={{
                        left: `${spot.left}%`,
                        top: `${spot.top}%`,
                        animationDelay: `${spot.delay}s`,
                        animationDuration: "1s",
                      }}
                    />
                  ))}
                </div>

                <h2 
                  className="relative mb-4 text-4xl font-black"
                  style={{
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  УСПЕХ!
                </h2>
                <p className="mb-6 text-muted-foreground">Вы выиграли!</p>
                {selectedTarget && (
                  <div className="mb-6 flex flex-col items-center">
                    <WeaponPlaceholder
                      className="mb-2 h-24 w-32"
                      color={rarityColors[selectedTarget.rarity as keyof typeof rarityColors]}
                      type={selectedTarget.weaponType}
                    />
                    <p className="text-lg font-bold">{selectedTarget.weapon} | {selectedTarget.name}</p>
                    <p className="text-2xl font-black text-green-400">+{formatPrice(selectedTarget.price)} ₽</p>
                  </div>
                )}
                <button
                  onClick={resetUpgrade}
                  className="relative z-10 w-full rounded-xl bg-gradient-to-r from-green-500 to-green-600 py-3 font-bold text-black hover:opacity-90 cursor-pointer"
                >
                  Забрать
                </button>
              </>
            ) : (
              <>
                {/* Cracked glass effect */}
                <div className="pointer-events-none absolute inset-0 opacity-20">
                  <svg className="h-full w-full" viewBox="0 0 100 100">
                    <path d="M50 50 L20 10 M50 50 L80 20 M50 50 L90 60 M50 50 L70 90 M50 50 L30 80 M50 50 L10 50" 
                      stroke="white" strokeWidth="0.5" fill="none" />
                  </svg>
                </div>

                <h2 
                  className="relative mb-4 text-4xl font-black"
                  style={{
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  НЕУДАЧА
                </h2>
                <p className="mb-6 text-muted-foreground">Предмет потерян</p>
                {selectedUserItem && (
                  <div className="mb-6 flex flex-col items-center opacity-50">
                    <WeaponPlaceholder
                      className="mb-2 h-24 w-32"
                      color={rarityColors[selectedUserItem.rarity as keyof typeof rarityColors]}
                      type={selectedUserItem.weaponType}
                    />
                    <p className="text-lg font-bold line-through">{selectedUserItem.weapon} | {selectedUserItem.name}</p>
                    <p className="text-xl text-red-400">-{formatPrice(selectedUserItem.price)} ₽</p>
                  </div>
                )}
                <button
                  onClick={resetUpgrade}
                  className="w-full rounded-xl bg-gradient-to-r from-red-500 to-red-600 py-3 font-bold text-white hover:opacity-90"
                >
                  Попробовать снова
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
