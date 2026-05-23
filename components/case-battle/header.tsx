"use client"

import { useEffect, useState } from "react"
import { Users, Package, LogOut } from "lucide-react"
import { SteamLoginButton } from "@/components/auth/steam-login-button"
import { formatNumberRu } from "@/lib/format-number"
import type { PublicUser } from "@/lib/auth/types"

export type GameMode = "cases" | "upgrades" | "contracts"

interface HeaderProps {
  balance: number
  onTopUp: () => void
  activeMode: GameMode
  onModeChange: (mode: GameMode) => void
  user: PublicUser | null
  authLoading?: boolean
  onLogin: () => void
  onLogout: () => void
  usersOnline?: number
  casesOpened?: number
}

export function Header({
  balance,
  onTopUp,
  activeMode,
  onModeChange,
  user,
  authLoading = false,
  onLogin,
  onLogout,
  usersOnline = 2847,
  casesOpened = 158432,
}: HeaderProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const navItems: { label: string; mode: GameMode }[] = [
    { label: "Кейсы", mode: "cases" },
    { label: "Апгрейды", mode: "upgrades" },
    { label: "Контракты", mode: "contracts" },
  ]

  const displayBalance = user ? balance : 0
  const formatStat = (value: number) => (mounted ? formatNumberRu(value) : String(value))

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-[#0d0f13]/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span
              className="text-xl font-black tracking-tight"
              style={{
                background:
                  "linear-gradient(135deg, #ff9900 0%, #ff5500 50%, #ff9900 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              CASE-BATTLE
            </span>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <button
                key={item.mode}
                onClick={() => onModeChange(item.mode)}
                className={`px-3 py-1.5 text-sm font-medium transition-all ${
                  activeMode === item.mode
                    ? "rounded bg-[#1a1d24] text-white"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-4 text-xs md:flex">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              <Users className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground" suppressHydrationWarning>
                {formatStat(usersOnline)}
              </span>
              <span>онлайн</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Package className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground" suppressHydrationWarning>
                {formatStat(casesOpened)}
              </span>
              <span>открыто</span>
            </div>
          </div>

          {authLoading ? (
            <span className="text-xs text-muted-foreground">Загрузка...</span>
          ) : user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-[#1a1d24] px-3 py-1.5">
                <img
                  src={
                    user.avatar ??
                    "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff25dc1cdfb_full.jpg"
                  }
                  alt={user.displayName}
                  className="h-6 w-6 rounded-full ring-1 ring-border object-cover"
                />
                <div className="hidden flex-col sm:flex">
                  <span className="max-w-[120px] truncate text-xs font-medium">
                    {user.displayName}
                  </span>
                  <span
                    className="text-xs font-bold"
                    style={{ color: "#ffd700" }}
                    suppressHydrationWarning
                  >
                    {formatStat(displayBalance)} ₽
                  </span>
                </div>
              </div>

              <button
                onClick={onTopUp}
                className="animate-pulse-glow rounded-lg px-3 py-1.5 text-sm font-bold text-black transition-all hover:scale-105 active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #ff9900 0%, #ff5500 100%)",
                }}
              >
                + Пополнить
              </button>

              <button
                type="button"
                onClick={onLogout}
                title="Выйти"
                className="rounded-lg border border-border/50 p-2 text-muted-foreground transition-colors hover:bg-[#1a1d24] hover:text-white"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <SteamLoginButton onClick={onLogin} />
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-1 border-t border-border/30 py-2 md:hidden">
        {navItems.map((item) => (
          <button
            key={item.mode}
            onClick={() => onModeChange(item.mode)}
            className={`px-4 py-1.5 text-sm font-medium transition-all ${
              activeMode === item.mode
                ? "rounded bg-[#1a1d24] text-white"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </header>
  )
}
