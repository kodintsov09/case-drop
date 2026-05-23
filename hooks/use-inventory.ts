"use client"

import { useCallback, useEffect, useState } from "react"
import type { InventorySkin } from "@/lib/game/inventory"

export function useInventory(enabled: boolean) {
  const [items, setItems] = useState<InventorySkin[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!enabled) {
      setItems([])
      setError(null)
      return
    }

    const silent = options?.silent ?? false
    if (!silent) setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/inventory", { cache: "no-store" })
      const data = await response.json()

      if (!response.ok) {
        setItems([])
        setError(data.error ?? "Не удалось загрузить инвентарь")
        return
      }

      setItems(Array.isArray(data) ? data : [])
    } catch {
      setItems([])
      setError("Не удалось загрузить инвентарь. Проверьте вход через Steam.")
    } finally {
      if (!silent) setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { items, loading, error, refresh, setItems }
}
