"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Flame, Package, Sparkles, X, ArrowRight, FileSignature, PenTool } from "lucide-react"
import { rarityColors } from "./svg-placeholders"
import { SkinCardImage } from "./skin-card-image"
import { Skin, formatPrice } from "@/lib/case-battle"
import type { InventorySkin } from "@/lib/game/inventory"
import type { PublicUser } from "@/lib/auth/types"

interface ContractsViewProps {
  inventory: InventorySkin[]
  inventoryLoading?: boolean
  inventoryError?: string | null
  onRefreshInventory: () => void
  onUserUpdate: (user: PublicUser) => void
}

export function ContractsView({
  inventory,
  inventoryLoading = false,
  inventoryError = null,
  onRefreshInventory,
  onUserUpdate,
}: ContractsViewProps) {
  const [contractSlots, setContractSlots] = useState<(InventorySkin | null)[]>(
    Array(10).fill(null)
  )
  const [availableInventory, setAvailableInventory] = useState<InventorySkin[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [reward, setReward] = useState<InventorySkin | null>(null)
  const [burnAnimation, setBurnAnimation] = useState(false)
  
  // Signature state
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [signatureTriggered, setSignatureTriggered] = useState(false)
  const [strokeCount, setStrokeCount] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [contractNumber, setContractNumber] = useState(10000)
  const [contractError, setContractError] = useState<string | null>(null)

  useEffect(() => {
    setContractNumber(Math.floor(10000 + Math.random() * 90000))
  }, [])

  useEffect(() => {
    const usedIds = new Set(
      contractSlots.filter(Boolean).map((item) => item!.inventoryItemId)
    )
    setAvailableInventory(inventory.filter((item) => !usedIds.has(item.inventoryItemId)))
  }, [inventory, contractSlots])

  const filledSlots = contractSlots.filter(Boolean).length
  const totalValue = contractSlots.reduce((sum, item) => sum + (item?.price || 0), 0)
  const minReward = Math.floor(totalValue * 0.5)
  const maxReward = Math.floor(totalValue * 3.5)
  
  // Initialize canvas when ready for signature
  useEffect(() => {
    if (filledSlots >= 3 && canvasRef.current && !signatureTriggered) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        // Set canvas size
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width * window.devicePixelRatio
        canvas.height = rect.height * window.devicePixelRatio
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
        
        // Clear and setup
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.lineWidth = 1.5
        ctx.strokeStyle = '#ff9900'
        ctx.shadowColor = '#ff9900'
        ctx.shadowBlur = 8
      }
    }
  }, [filledSlots, signatureTriggered])
  
  // Reset signature when items change
  useEffect(() => {
    if (filledSlots < 3) {
      setHasSignature(false)
      setSignatureTriggered(false)
      setStrokeCount(0)
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        }
      }
    }
  }, [filledSlots])
  
  // Drawing handlers
  const getCanvasCoordinates = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    const rect = canvas.getBoundingClientRect()
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      }
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }, [])

  const addToContract = useCallback((item: InventorySkin) => {
    if (filledSlots >= 10 || isProcessing) return

    const emptyIndex = contractSlots.findIndex(slot => slot === null)
    if (emptyIndex === -1) return

    const newSlots = [...contractSlots]
    newSlots[emptyIndex] = item
    setContractSlots(newSlots)
    setAvailableInventory((prev) =>
      prev.filter((i) => i.inventoryItemId !== item.inventoryItemId)
    )
    
    // Reset signature when adding new items
    setHasSignature(false)
    setSignatureTriggered(false)
    setStrokeCount(0)
  }, [contractSlots, filledSlots, isProcessing])

  const removeFromContract = useCallback((index: number) => {
    if (isProcessing) return

    const item = contractSlots[index]
    if (!item) return

    const newSlots = [...contractSlots]
    newSlots[index] = null
    setContractSlots(newSlots)
    setAvailableInventory(prev => [...prev, item])
    
    // Reset signature when removing items
    setHasSignature(false)
    setSignatureTriggered(false)
    setStrokeCount(0)
  }, [contractSlots, isProcessing])
  
  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (signatureTriggered || isProcessing) return
    
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return
    
    setIsDrawing(true)
    const coords = getCanvasCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(coords.x, coords.y)
  }, [signatureTriggered, isProcessing, getCanvasCoordinates])
  
  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || signatureTriggered || isProcessing) return
    
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return
    
    const coords = getCanvasCoordinates(e)
    ctx.lineTo(coords.x, coords.y)
    ctx.stroke()
    
    // Track that user has drawn something
    if (!hasSignature) {
      setHasSignature(true)
    }
    setStrokeCount(prev => prev + 1)
  }, [isDrawing, signatureTriggered, isProcessing, hasSignature, getCanvasCoordinates])
  
  const stopDrawing = useCallback(() => {
    if (!isDrawing) return
    setIsDrawing(false)
  }, [isDrawing])
  
  const clearSignature = useCallback(() => {
    if (signatureTriggered || isProcessing) return
    
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
    setStrokeCount(0)
  }, [signatureTriggered, isProcessing])
  
  const executeContractAfterSignature = useCallback(async () => {
    if (filledSlots < 3 || isProcessing) return

    const ids = contractSlots
      .filter((item): item is InventorySkin => item !== null)
      .map((item) => item.inventoryItemId)

    setIsProcessing(true)
    setBurnAnimation(true)
    setContractError(null)

    try {
      const response = await fetch("/api/contracts/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryItemIds: ids }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? "Ошибка контракта")
      }

      setTimeout(() => {
        setBurnAnimation(false)
        setTimeout(() => {
          setReward(data.reward)
          setContractNumber(data.contractNumber)
          setShowResult(true)
          setIsProcessing(false)
          setContractSlots(Array(10).fill(null))
          if (data.user) onUserUpdate(data.user)
          onRefreshInventory()
        }, 500)
      }, 2000)
    } catch (err) {
      setBurnAnimation(false)
      setIsProcessing(false)
      setContractError(
        err instanceof Error ? err.message : "Не удалось выполнить контракт"
      )
    }
  }, [filledSlots, isProcessing, contractSlots, onRefreshInventory, onUserUpdate])
  
  // Manual confirm handler
  const confirmContract = useCallback(() => {
    if (!hasSignature || signatureTriggered || isProcessing || filledSlots < 3) return
    setSignatureTriggered(true)
    setTimeout(() => {
      executeContractAfterSignature()
    }, 600)
  }, [hasSignature, signatureTriggered, isProcessing, filledSlots, executeContractAfterSignature])

  const resetContract = useCallback(() => {
    setContractSlots(Array(10).fill(null))
    setShowResult(false)
    setReward(null)
    setHasSignature(false)
    setSignatureTriggered(false)
    setStrokeCount(0)
    onRefreshInventory()
  }, [onRefreshInventory])

  const sellReward = useCallback(async () => {
    if (!reward) {
      resetContract()
      return
    }

    try {
      const response = await fetch(`/api/inventory/${reward.inventoryItemId}/sell`, {
        method: "POST",
      })
      const data = await response.json()
      if (data.user) onUserUpdate(data.user)
      onRefreshInventory()
    } catch {
      // ignore
    }
    resetContract()
  }, [reward, resetContract, onUserUpdate, onRefreshInventory])

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-6">
      {(contractError || inventoryError) && (
        <p className="mb-4 rounded border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {contractError ?? inventoryError}
        </p>
      )}
      {/* Contract Zone */}
      <div className="mb-6 rounded-xl border border-border/50 bg-[#0d0f13]/80 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <Package className="h-5 w-5 text-orange-500" />
            Зона контракта
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Предметов: <span className="font-bold text-white">{filledSlots}</span> / 10
            </span>
            <span className="text-sm text-muted-foreground">
              Стоимость: <span className="font-bold text-orange-400">{formatPrice(totalValue)} ₽</span>
            </span>
          </div>
        </div>

        {/* Contract Slots */}
        <div className="mb-4 grid grid-cols-5 gap-3 sm:grid-cols-10">
          {contractSlots.map((item, index) => (
            <div
              key={index}
              className={`relative aspect-square rounded-lg border-2 transition-all ${
                item 
                  ? "bg-[#12151a]"
                  : "border-dashed border-border/30 bg-[#0a0c10]"
              } ${burnAnimation && item ? "animate-pulse" : ""}`}
              style={{
                borderColor: item ? rarityColors[item.rarity as keyof typeof rarityColors] : undefined,
                boxShadow: item && burnAnimation ? `0 0 20px ${rarityColors[item.rarity as keyof typeof rarityColors]}80` : undefined,
              }}
            >
              {item ? (
                <button
                  onClick={() => removeFromContract(index)}
                  disabled={isProcessing}
                  className="group relative flex h-full w-full flex-col items-center justify-center p-1"
                >
                  <SkinCardImage
                    skin={item}
                    className="h-full w-full"
                    color={rarityColors[item.rarity as keyof typeof rarityColors]}
                  />
                  {!isProcessing && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                      <X className="h-5 w-5 text-red-400" />
                    </div>
                  )}
                  {burnAnimation && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <Flame className="h-8 w-8 animate-pulse text-orange-500" />
                    </div>
                  )}
                </button>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-2xl font-bold text-border/30">{index + 1}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {filledSlots >= 3 && !isProcessing && (
          <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={executeContractAfterSignature}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-3 text-base font-black uppercase tracking-wide text-black shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] active:scale-95 sm:w-auto"
            >
              <Flame className="h-5 w-5" />
              Выполнить контракт ({filledSlots} шт.)
            </button>
            <p className="text-center text-xs text-muted-foreground">
              Или подпишите бланк ниже — это необязательно
            </p>
          </div>
        )}

        {/* Reward Preview & Signature Zone */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            {filledSlots >= 3 && (
              <p className="text-sm text-muted-foreground">
                Возможный дроп: от{" "}
                <span className="font-bold text-orange-400">{formatPrice(minReward)} ₽</span>
                {" "}до{" "}
                <span className="font-bold text-green-400">{formatPrice(maxReward)} ₽</span>
              </p>
            )}
          </div>
          
          {/* Signature Zone - appears when 3-10 items selected */}
          {filledSlots >= 3 && filledSlots <= 10 && !isProcessing ? (
            <div className="relative w-full max-w-md">
              {/* Contract Blank Header */}
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSignature className="h-5 w-5 text-orange-500" />
                  <span className="text-sm font-bold text-white">КОНТРАКТ №{contractNumber}</span>
                </div>
                {hasSignature && !signatureTriggered && (
                  <button
                    onClick={clearSignature}
                    className="text-xs text-muted-foreground hover:text-white"
                  >
                    Очистить
                  </button>
                )}
              </div>
              
              {/* Signature Canvas Area */}
              <div 
                className={`relative overflow-hidden rounded-xl border-2 transition-all ${
                  signatureTriggered 
                    ? 'border-green-500 bg-green-500/10' 
                    : hasSignature 
                      ? 'border-orange-500/70 bg-[#12151a]' 
                      : 'border-dashed border-orange-500/50 bg-[#0d0f13]'
                }`}
                style={{
                  boxShadow: signatureTriggered 
                    ? '0 0 30px rgba(34, 197, 94, 0.3), inset 0 0 30px rgba(34, 197, 94, 0.1)' 
                    : hasSignature 
                      ? '0 0 20px rgba(255, 153, 0, 0.2), inset 0 0 20px rgba(255, 153, 0, 0.05)' 
                      : 'none'
                }}
              >
                {/* Corner decorations */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-orange-500/50" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-orange-500/50" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-orange-500/50" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-orange-500/50" />
                
                {/* Background lines (contract paper effect) */}
                <div className="pointer-events-none absolute inset-0 opacity-10">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i} 
                      className="absolute left-4 right-4 h-px bg-white/30"
                      style={{ top: `${20 + i * 15}%` }}
                    />
                  ))}
                </div>
                
                {/* Canvas for signature */}
                <canvas
                  ref={canvasRef}
                  className="relative z-10 h-16 w-full cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                
                {/* Placeholder text when no signature */}
                {!hasSignature && !signatureTriggered && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <PenTool className="mb-1 h-5 w-5 text-orange-500/50" />
                    <span className="text-xs text-orange-500/70">Проведите здесь, чтобы подписать</span>
                  </div>
                )}
                
                {/* Signed indicator */}
                {signatureTriggered && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="flex items-center gap-2 rounded-lg bg-green-500/20 px-4 py-2">
                      <Sparkles className="h-5 w-5 text-green-400" />
                      <span className="font-bold text-green-400">ПОДПИСАНО</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Confirm button */}
              {hasSignature && !signatureTriggered && (
                <button
                  onClick={confirmContract}
                  className="mt-3 w-full rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:from-orange-400 hover:to-orange-500 hover:shadow-orange-500/40"
                >
                  Подтвердить контракт
                </button>
              )}
            </div>
          ) : isProcessing ? (
            <div className="flex items-center gap-2 rounded-xl bg-[#1a1d24] px-8 py-3 text-lg font-black uppercase tracking-wide text-orange-400">
              <Flame className="h-5 w-5 animate-pulse" />
              Сжигаем контракт...
            </div>
          ) : (
            <button
              disabled={true}
              className="flex cursor-not-allowed items-center gap-2 rounded-xl bg-[#1a1d24] px-8 py-3 text-lg font-black uppercase tracking-wide text-muted-foreground"
            >
              <Flame className="h-5 w-5" />
              Добавьте мин. 3 предмета
            </button>
          )}
        </div>
      </div>

      {/* User Inventory */}
      <div className="rounded-xl border border-border/50 bg-[#0d0f13]/80 p-4">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
          <span className="h-1 w-4 rounded bg-gradient-to-r from-orange-500 to-orange-600" />
          Ваш инвентарь
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            (мин. 3 предмета)
          </span>
        </h2>
        
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {inventoryLoading && (
            <p className="col-span-full text-center text-sm text-muted-foreground">
              Загрузка инвентаря...
            </p>
          )}
          {!inventoryLoading && availableInventory.length === 0 && (
            <p className="col-span-full text-center text-sm text-muted-foreground">
              {inventoryError
                ? inventoryError
                : "Нет предметов. Откройте кейсы или войдите через Steam."}
            </p>
          )}
          {availableInventory.map((item) => (
            <button
              key={item.inventoryItemId}
              onClick={() => addToContract(item)}
              disabled={filledSlots >= 10 || isProcessing}
              className={`group relative flex flex-col items-center rounded-lg border p-2 transition-all ${
                filledSlots >= 10
                  ? "cursor-not-allowed opacity-50"
                  : "border-border/30 bg-[#12151a] hover:border-border hover:bg-[#1a1d24]"
              }`}
              style={{
                borderColor: `${rarityColors[item.rarity as keyof typeof rarityColors]}30`,
              }}
            >
              <div className="relative mb-1 h-12 w-full">
                <SkinCardImage
                  skin={item}
                  className="h-full w-full"
                  color={rarityColors[item.rarity as keyof typeof rarityColors]}
                />
              </div>
              <div className="w-full text-center">
                <p className="truncate text-[9px] text-muted-foreground">{item.weapon}</p>
                <p className="truncate text-[10px] font-medium">{item.name}</p>
                <p 
                  className="mt-0.5 text-xs font-bold"
                  style={{ color: rarityColors[item.rarity as keyof typeof rarityColors] }}
                >
                  {formatPrice(item.price)} ₽
                </p>
              </div>
              {filledSlots < 10 && !isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-orange-500/20 opacity-0 transition-opacity group-hover:opacity-100">
                  <ArrowRight className="h-5 w-5 text-orange-400" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Result Modal */}
      {showResult && reward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-green-500/30 bg-gradient-to-b from-green-900/20 to-[#0d0f13] p-8 text-center">
            <button
              onClick={resetContract}
              className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Cyber graphic effect */}
            <div className="pointer-events-none absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyYzU1ZSIgc3Ryb2tlLXdpZHRoPSIwLjUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')]" />
            </div>

            <div className="relative">
              <Sparkles className="mx-auto mb-2 h-8 w-8 text-green-400" />
              <h2 
                className="mb-2 text-3xl font-black"
                style={{
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                КОНТРАКТ ВЫПОЛНЕН
              </h2>
              <p className="mb-6 text-muted-foreground">Вы получили:</p>

              <div className="mb-6 rounded-xl border border-border/50 bg-[#12151a] p-4">
                <div className="mx-auto mb-3 h-28 w-40">
                  <SkinCardImage
                    skin={reward}
                    className="h-full w-full"
                    color={rarityColors[reward.rarity as keyof typeof rarityColors]}
                  />
                </div>
                <p className="text-sm text-muted-foreground">{reward.weapon}</p>
                <p className="text-lg font-bold">{reward.name}</p>
                <p 
                  className="mt-2 text-2xl font-black"
                  style={{ color: rarityColors[reward.rarity as keyof typeof rarityColors] }}
                >
                  {formatPrice(reward.price)} ₽
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={sellReward}
                  className="flex-1 rounded-xl bg-gradient-to-r from-green-500 to-green-600 py-3 font-bold text-black hover:opacity-90"
                >
                  Продать за {formatPrice(reward.price)} ₽
                </button>
                <button
                  onClick={resetContract}
                  className="flex-1 rounded-xl border border-border bg-[#1a1d24] py-3 font-bold text-white hover:bg-[#22252d]"
                >
                  В инвентарь
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
