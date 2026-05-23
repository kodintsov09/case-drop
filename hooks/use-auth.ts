"use client"

import { useCallback, useEffect, useState } from "react"
import type { PublicUser } from "@/lib/auth/types"

export function useAuth() {
  const [user, setUser] = useState<PublicUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" })
      const data = await response.json()
      setUser(data.user ?? null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const loginWithSteam = useCallback(() => {
    window.location.href = "/api/auth/steam"
  }, [])

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    setUser(null)
    window.location.reload()
  }, [])

  const setBalanceLocal = useCallback((balance: number) => {
    setUser((prev) => (prev ? { ...prev, balance } : null))
  }, [])

  const syncBalance = useCallback(
    async (delta: number) => {
      if (!user) return null

      const response = await fetch("/api/user/balance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? "Не удалось сохранить баланс")
      }

      setUser(data.user)
      return data.user as PublicUser
    },
    [user]
  )

  return {
    user,
    loading,
    isAuthenticated: Boolean(user),
    refresh,
    loginWithSteam,
    logout,
    setBalanceLocal,
    syncBalance,
  }
}
