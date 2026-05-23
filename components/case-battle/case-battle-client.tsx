"use client"

import { useState, useCallback, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Header, GameMode } from "@/components/case-battle/header"
import { LiveDropFeed } from "@/components/case-battle/live-drop-feed"
import { CaseGrid } from "@/components/case-battle/case-grid"
import { RouletteModal } from "@/components/case-battle/roulette-modal"
import { DepositModal } from "@/components/case-battle/deposit-modal"
import { UpgradesView } from "@/components/case-battle/upgrades-view"
import { ContractsView } from "@/components/case-battle/contracts-view"
import { SteamLoginButton } from "@/components/auth/steam-login-button"
import { useAuth } from "@/hooks/use-auth"
import { useInventory } from "@/hooks/use-inventory"
import { useBalance, type CaseItem } from "@/lib/case-battle"
import type { PublicUser } from "@/lib/auth/types"

interface CaseBattleClientProps {
  initialCases: CaseItem[]
}

export function CaseBattleClient({ initialCases }: CaseBattleClientProps) {
  const searchParams = useSearchParams()
  const {
    user,
    loading: authLoading,
    isAuthenticated,
    refresh,
    loginWithSteam,
    logout,
    syncBalance,
    setBalanceLocal,
  } = useAuth()

  const {
    items: inventory,
    loading: inventoryLoading,
    error: inventoryError,
    refresh: refreshInventory,
  } = useInventory(isAuthenticated)

  const { balance, setBalance } = useBalance(0)
  const [activeMode, setActiveMode] = useState<GameMode>("cases")
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDepositOpen, setIsDepositOpen] = useState(false)
  const [authNotice, setAuthNotice] = useState<string | null>(null)
  const [stats, setStats] = useState({ usersOnline: 2847, casesOpened: 158432 })

  useEffect(() => {
    if (user) {
      setBalance(user.balance)
    }
  }, [user, setBalance])

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.usersOnline) setStats(data)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const authSuccess = searchParams.get("auth_success")
    const authError = searchParams.get("auth_error")

    if (authSuccess) {
      setAuthNotice("Вы успешно вошли через Steam!")
      refresh()
      refreshInventory()
      window.history.replaceState({}, "", "/")
    } else if (authError) {
      const messages: Record<string, string> = {
        steam_verify_failed:
          "Steam не подтвердил вход. Убедитесь, что в .env указан тот же URL, что в браузере.",
        server: "Ошибка сервера при входе.",
        config: "Неверная конфигурация сайта (APP_URL / SESSION_SECRET).",
      }
      const detail = searchParams.get("auth_detail")
      const base = messages[authError] ?? "Не удалось войти через Steam"
      setAuthNotice(detail ? `${base} (${detail})` : base)
      window.history.replaceState({}, "", "/")
    }
  }, [searchParams, refresh, refreshInventory])

  const handleUserUpdate = useCallback(
    (updated: PublicUser) => {
      setBalanceLocal(updated.balance)
      setBalance(updated.balance)
    },
    [setBalanceLocal, setBalance]
  )

  const handleCaseClick = useCallback((caseItem: CaseItem) => {
    if (!isAuthenticated) {
      setAuthNotice("Войдите через Steam, чтобы открывать кейсы")
      return
    }
    if (caseItem.skins.length === 0) {
      setAuthNotice("В этом кейсе нет скинов — добавьте их в админке")
      return
    }
    setSelectedCase(caseItem)
    setIsModalOpen(true)
  }, [isAuthenticated])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
    setSelectedCase(null)
  }, [])

  const handleOpenDeposit = useCallback(() => {
    if (!isAuthenticated) {
      setAuthNotice("Войдите через Steam, чтобы пополнить баланс")
      return
    }
    setIsDepositOpen(true)
  }, [isAuthenticated])

  const handleDeposit = useCallback(
    async (amount: number) => {
      try {
        await syncBalance(amount)
      } catch {
        setAuthNotice("Не удалось сохранить баланс")
      }
    },
    [syncBalance]
  )

  const handleRedeemPromo = useCallback(
    async (code: string, depositAmount?: number) => {
      const response = await fetch("/api/promocodes/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, depositAmount }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error ?? "Промокод не применён")
      }
      if (data.user) handleUserUpdate(data.user)
      setAuthNotice(data.message)
      return data
    },
    [handleUserUpdate]
  )

  return (
    <div className="min-h-screen bg-gaming-texture">
      <Header
        balance={balance}
        user={user}
        authLoading={authLoading}
        onLogin={loginWithSteam}
        onLogout={logout}
        onTopUp={handleOpenDeposit}
        activeMode={activeMode}
        onModeChange={setActiveMode}
        usersOnline={stats.usersOnline}
        casesOpened={stats.casesOpened}
      />

      {authNotice && (
        <div className="mx-auto max-w-7xl px-4 pt-3">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-[#5b8def]/40 bg-[#5b8def]/10 px-4 py-2 text-sm text-[#c8daf8]">
            <span>{authNotice}</span>
            <button
              type="button"
              className="text-xs text-[#8b929a] hover:text-white"
              onClick={() => setAuthNotice(null)}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {!authLoading && !isAuthenticated && (
        <div className="mx-auto max-w-7xl px-4 pt-4">
          <div className="flex flex-col items-center justify-between gap-4 rounded-lg border border-border/40 bg-[#12151a]/80 px-6 py-5 sm:flex-row">
            <div>
              <p className="font-medium">Войдите через Steam</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Регистрация автоматическая — кейсы, инвентарь и баланс сохраняются в аккаунте
              </p>
            </div>
            <SteamLoginButton onClick={loginWithSteam} />
          </div>
        </div>
      )}

      {activeMode === "cases" && <LiveDropFeed />}

      <main>
        {activeMode === "cases" && (
          <>
            <CaseGrid cases={initialCases} onCaseClick={handleCaseClick} />
            <div className="pointer-events-none fixed inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0a0c10] to-transparent" />
          </>
        )}

        {activeMode === "upgrades" && (
          <UpgradesView
            inventory={inventory}
            inventoryLoading={inventoryLoading}
            inventoryError={inventoryError}
            luckModifier={user?.luckModifier ?? 1}
            onRefreshInventory={refreshInventory}
            onUserUpdate={handleUserUpdate}
          />
        )}

        {activeMode === "contracts" && (
          <ContractsView
            inventory={inventory}
            inventoryLoading={inventoryLoading}
            inventoryError={inventoryError}
            onRefreshInventory={refreshInventory}
            onUserUpdate={handleUserUpdate}
          />
        )}
      </main>

      {selectedCase && isAuthenticated && (
        <RouletteModal
          caseItem={selectedCase}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          balance={user?.balance ?? balance}
          onUserUpdate={handleUserUpdate}
          onRefreshInventory={refreshInventory}
        />
      )}

      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        onDeposit={handleDeposit}
        onRedeemPromo={handleRedeemPromo}
      />
    </div>
  )
}
