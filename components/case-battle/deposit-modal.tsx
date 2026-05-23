"use client"

import { useState, useCallback } from "react"
import { X, CreditCard } from "lucide-react"

interface DepositModalProps {
  isOpen: boolean
  onClose: () => void
  onDeposit: (amount: number) => void
  onRedeemPromo?: (code: string, depositAmount?: number) => Promise<unknown>
}

const quickAmounts = [100, 500, 1000, 2500, 5000]

export function DepositModal({
  isOpen,
  onClose,
  onDeposit,
  onRedeemPromo,
}: DepositModalProps) {
  const [amount, setAmount] = useState<string>("")
  const [promoCode, setPromoCode] = useState("")
  const [promoError, setPromoError] = useState<string | null>(null)
  const [selectedQuick, setSelectedQuick] = useState<number | null>(null)

  const handleQuickSelect = useCallback((value: number) => {
    setSelectedQuick(value)
    setAmount(value.toString())
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "")
    setAmount(value)
    setSelectedQuick(null)
  }, [])

  const handleSubmit = useCallback(() => {
    const numAmount = parseInt(amount, 10)
    if (numAmount > 0) {
      onDeposit(numAmount)
      setAmount("")
      setSelectedQuick(null)
      onClose()
    }
  }, [amount, onDeposit, onClose])

  const handleClose = useCallback(() => {
    setAmount("")
    setSelectedQuick(null)
    onClose()
  }, [onClose])

  if (!isOpen) return null

  const numAmount = parseInt(amount, 10) || 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border/50 bg-[#0d0f13] p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-[#1a1d24] hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div 
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{
              background: 'linear-gradient(135deg, #ff9900 0%, #ff5500 100%)',
            }}
          >
            <CreditCard className="h-5 w-5 text-black" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Пополнение баланса</h2>
            <p className="text-xs text-muted-foreground">Выберите сумму или введите свою</p>
          </div>
        </div>

        {/* Amount input */}
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              value={amount}
              onChange={handleInputChange}
              placeholder="Введите сумму в ₽"
              className="w-full rounded-lg border border-border/50 bg-[#12151a] px-4 py-3 text-lg font-bold outline-none transition-all placeholder:text-muted-foreground/50 focus:border-[#ff9900]/50 focus:ring-1 focus:ring-[#ff9900]/20"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">
              ₽
            </span>
          </div>
        </div>

        {/* Quick select buttons */}
        <div className="mb-6 grid grid-cols-5 gap-2">
          {quickAmounts.map((value) => (
            <button
              key={value}
              onClick={() => handleQuickSelect(value)}
              className={`rounded-lg border py-2.5 text-sm font-bold transition-all ${
                selectedQuick === value
                  ? "border-[#ff9900] bg-[#ff9900]/10 text-[#ff9900]"
                  : "border-border/50 bg-[#1a1d24] text-white hover:border-border hover:bg-[#252830]"
              }`}
            >
              {value}
            </button>
          ))}
        </div>

        {onRedeemPromo && (
          <div className="mb-4 rounded-lg border border-border/40 bg-[#12151a] p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Промокод</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value.toUpperCase())
                  setPromoError(null)
                }}
                placeholder="BONUS500"
                className="flex-1 rounded-lg border border-border/50 bg-[#0d0f13] px-3 py-2 text-sm font-mono uppercase outline-none focus:border-[#5b8def]"
              />
              <button
                type="button"
                onClick={async () => {
                  if (!promoCode.trim()) return
                  try {
                    const num = parseInt(amount, 10) || 0
                    await onRedeemPromo(promoCode.trim(), num > 0 ? num : undefined)
                    setPromoCode("")
                    onClose()
                  } catch (err) {
                    setPromoError(
                      err instanceof Error ? err.message : "Ошибка промокода"
                    )
                  }
                }}
                className="rounded-lg bg-[#5b8def] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a7ad4]"
              >
                Применить
              </button>
            </div>
            {promoError && (
              <p className="mt-2 text-xs text-red-400">{promoError}</p>
            )}
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={numAmount <= 0}
          className="w-full rounded-lg py-3.5 text-base font-black text-black transition-all hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:opacity-50"
          style={{
            background: numAmount > 0 
              ? 'linear-gradient(135deg, #ff9900 0%, #ff5500 100%)'
              : '#333',
          }}
        >
          {numAmount > 0 
            ? `Перейти к оплате — ${numAmount.toLocaleString('ru-RU')} ₽`
            : 'Введите сумму'
          }
        </button>

        {/* Footer note */}
        <p className="mt-4 text-center text-[10px] text-muted-foreground">
          Безопасная оплата через защищённые платёжные системы
        </p>
      </div>
    </div>
  )
}
