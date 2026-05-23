"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { RemoteImage } from "@/components/case-battle/remote-image"
import { rarityConfig, type Rarity } from "@/lib/case-battle"
import { LUCK_MODIFIERS, RARITIES } from "@/lib/admin/constants"
import { isInvalidStoredImageUrl } from "@/lib/images"

type AdminTab = "skins" | "cases" | "promocodes" | "users"

type AdminSkin = {
  id: string
  name: string
  weaponType: string
  rarity: string
  price: number
  image: string
}

type AdminCaseItem = {
  id: string
  skinId: string
  dropChance: number
  skin: AdminSkin
}

type AdminCase = {
  id: string
  name: string
  slug: string
  price: number
  image: string
  isActive: boolean
  items: AdminCaseItem[]
}

type AdminPromocode = {
  id: string
  code: string
  bonusType: string
  bonusValue: number
  maxUses: number
  usedCount: number
  isActive: boolean
}

type AdminUser = {
  id: string
  username: string
  displayName: string
  role: string
  balance: number
  luckModifier: number
  avatar: string | null
}

type SelectedSkin = {
  skinId: string
  dropChance: string
}

const TABS: { id: AdminTab; label: string }[] = [
  { id: "skins", label: "База скинов" },
  { id: "cases", label: "Конструктор кейсов" },
  { id: "promocodes", label: "Промокоды" },
  { id: "users", label: "Пользователи" },
]

async function parseApiResponse<T>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Ошибка запроса к серверу"
    )
  }
  return data as T
}

export default function AdminPanelSecretPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("skins")
  const [skins, setSkins] = useState<AdminSkin[]>([])
  const [cases, setCases] = useState<AdminCase[]>([])
  const [promocodes, setPromocodes] = useState<AdminPromocode[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [balanceDrafts, setBalanceDrafts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [skinForm, setSkinForm] = useState({
    name: "",
    price: "",
    image: "",
    rarity: "milspec" as Rarity,
  })

  const [caseForm, setCaseForm] = useState({
    name: "",
    price: "",
    image: "",
  })

  const [promoForm, setPromoForm] = useState({
    code: "",
    bonusType: "BALANCE" as "BALANCE" | "DEPOSIT_PERCENT",
    bonusValue: "",
    maxUses: "",
  })

  const [selectedSkins, setSelectedSkins] = useState<Record<string, SelectedSkin>>({})
  const [deletingSkinId, setDeletingSkinId] = useState<string | null>(null)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)

  const dropChanceTotal = useMemo(() => {
    return Object.values(selectedSkins).reduce(
      (sum, item) => sum + (Number(item.dropChance) || 0),
      0
    )
  }, [selectedSkins])

  const dropChanceValid = useMemo(() => {
    if (Object.keys(selectedSkins).length === 0) return false
    return Math.abs(dropChanceTotal - 100) < 0.01
  }, [selectedSkins, dropChanceTotal])

  const loadSkins = useCallback(async () => {
    const response = await fetch("/api/admin/skins")
    const data = await parseApiResponse<AdminSkin[]>(response)
    setSkins(data)
  }, [])

  const loadCases = useCallback(async () => {
    const response = await fetch("/api/admin/cases")
    const data = await parseApiResponse<AdminCase[]>(response)
    setCases(data)
  }, [])

  const loadPromocodes = useCallback(async () => {
    const response = await fetch("/api/admin/promocodes")
    const data = await parseApiResponse<AdminPromocode[]>(response)
    setPromocodes(data)
  }, [])

  const loadUsers = useCallback(async () => {
    const response = await fetch("/api/admin/users")
    const data = await parseApiResponse<AdminUser[]>(response)
    setUsers(data)
    setBalanceDrafts(
      Object.fromEntries(data.map((user) => [user.id, String(user.balance)]))
    )
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([loadSkins(), loadCases(), loadPromocodes(), loadUsers()])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки данных")
    } finally {
      setLoading(false)
    }
  }, [loadSkins, loadCases, loadPromocodes, loadUsers])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const showSuccess = (text: string) => {
    setMessage(text)
    setError(null)
  }

  const showError = (text: string) => {
    setError(text)
    setMessage(null)
  }

  const handleAddSkin = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setMessage(null)
    setError(null)

    try {
      const response = await fetch("/api/admin/skins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: skinForm.name,
          price: Number(skinForm.price),
          image: skinForm.image,
          rarity: skinForm.rarity,
        }),
      })
      await parseApiResponse(response)
      setSkinForm({ name: "", price: "", image: "", rarity: "milspec" })
      showSuccess("Скин добавлен в базу")
      await loadSkins()
    } catch (err) {
      showError(err instanceof Error ? err.message : "Не удалось добавить скин")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteSkin = async (skinId: string) => {
    if (!confirm("Удалить этот скин из базы? Он будет убран из всех кейсов.")) {
      return
    }

    setDeletingSkinId(skinId)
    setMessage(null)
    setError(null)

    try {
      const response = await fetch(`/api/admin/skins/${skinId}`, {
        method: "DELETE",
      })
      await parseApiResponse(response)
      showSuccess("Скин удалён")
      await Promise.all([loadSkins(), loadCases()])
    } catch (err) {
      showError(err instanceof Error ? err.message : "Не удалось удалить скин")
    } finally {
      setDeletingSkinId(null)
    }
  }

  const toggleSkinSelection = (skinId: string) => {
    setSelectedSkins((prev) => {
      const next = { ...prev }
      if (next[skinId]) {
        delete next[skinId]
      } else {
        const count = Object.keys(prev).length
        const defaultChance = count === 0 ? "100" : "10"
        next[skinId] = { skinId, dropChance: defaultChance }
      }
      return next
    })
  }

  const updateDropChance = (skinId: string, dropChance: string) => {
    setSelectedSkins((prev) => ({
      ...prev,
      [skinId]: { skinId, dropChance },
    }))
  }

  const handleCreateCase = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessage(null)
    setError(null)

    if (!dropChanceValid) {
      showError(
        `Сумма шансов должна быть 100%. Сейчас: ${dropChanceTotal.toFixed(2)}%`
      )
      return
    }

    setSubmitting(true)

    try {
      const items = Object.values(selectedSkins).map((item) => ({
        skinId: item.skinId,
        dropChance: Number(item.dropChance),
      }))

      const response = await fetch("/api/admin/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: caseForm.name,
          price: Number(caseForm.price),
          image: caseForm.image,
          items,
        }),
      })
      await parseApiResponse(response)
      setCaseForm({ name: "", price: "", image: "" })
      setSelectedSkins({})
      showSuccess("Кейс создан и отображается на главной")
      await loadCases()
    } catch (err) {
      showError(err instanceof Error ? err.message : "Не удалось создать кейс")
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreatePromocode = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setMessage(null)
    setError(null)

    try {
      const response = await fetch("/api/admin/promocodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promoForm.code,
          bonusType: promoForm.bonusType,
          bonusValue: Number(promoForm.bonusValue),
          maxUses: Number(promoForm.maxUses),
        }),
      })
      await parseApiResponse(response)
      setPromoForm({
        code: "",
        bonusType: "BALANCE",
        bonusValue: "",
        maxUses: "",
      })
      showSuccess("Промокод создан")
      await loadPromocodes()
    } catch (err) {
      showError(err instanceof Error ? err.message : "Не удалось создать промокод")
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateBalance = async (userId: string) => {
    setUpdatingUserId(userId)
    setMessage(null)
    setError(null)

    try {
      const balance = Number(balanceDrafts[userId])
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, balance }),
      })
      const updated = await parseApiResponse<AdminUser>(response)
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)))
      setBalanceDrafts((prev) => ({ ...prev, [userId]: String(updated.balance) }))
      showSuccess(`Баланс обновлён: ${updated.balance.toLocaleString("ru-RU")} ₽`)
    } catch (err) {
      showError(err instanceof Error ? err.message : "Не удалось обновить баланс")
    } finally {
      setUpdatingUserId(null)
    }
  }

  const handleLuckChange = async (userId: string, luckModifier: number) => {
    setUpdatingUserId(userId)
    setMessage(null)
    setError(null)

    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, luckModifier }),
      })
      const updated = await parseApiResponse<AdminUser>(response)
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)))
      showSuccess("Режим удачи сохранён")
    } catch (err) {
      showError(err instanceof Error ? err.message : "Не удалось сохранить режим удачи")
      await loadUsers()
    } finally {
      setUpdatingUserId(null)
    }
  }

  const formatPromoBonus = (promo: AdminPromocode) => {
    if (promo.bonusType === "BALANCE") {
      return `+${promo.bonusValue.toLocaleString("ru-RU")} ₽ на баланс`
    }
    return `+${promo.bonusValue}% к пополнению`
  }

  const handleDeleteUser = async (userId: string, displayName: string) => {
    if (!confirm(`Удалить пользователя ${displayName}?`)) return
    setMessage(null)
    setError(null)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" })
      await parseApiResponse(response)
      showSuccess("Пользователь удалён")
      await loadUsers()
    } catch (err) {
      showError(err instanceof Error ? err.message : "Не удалось удалить")
    }
  }

  const handleDeletePromocode = async (id: string, code: string) => {
    if (!confirm(`Удалить промокод ${code}?`)) return
    try {
      const response = await fetch(`/api/admin/promocodes/${id}`, { method: "DELETE" })
      await parseApiResponse(response)
      showSuccess("Промокод удалён")
      await loadPromocodes()
    } catch (err) {
      showError(err instanceof Error ? err.message : "Не удалось удалить")
    }
  }

  const handleDeleteCase = async (id: string, name: string) => {
    if (!confirm(`Удалить кейс «${name}»?`)) return
    try {
      const response = await fetch(`/api/admin/cases/${id}`, { method: "DELETE" })
      await parseApiResponse(response)
      showSuccess("Кейс удалён")
      await loadCases()
    } catch (err) {
      showError(err instanceof Error ? err.message : "Не удалось удалить")
    }
  }

  const handleToggleCase = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      })
      await parseApiResponse(response)
      showSuccess(isActive ? "Кейс скрыт с главной" : "Кейс снова активен")
      await loadCases()
    } catch (err) {
      showError(err instanceof Error ? err.message : "Не удалось обновить")
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1115] text-[#e8eaed]">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-8 border-b border-[#2a2f38] pb-6">
          <p className="text-xs font-medium uppercase tracking-widest text-[#8b929a]">
            Внутренняя панель
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Админка Case Battle
          </h1>
          <p className="mt-2 text-sm text-[#8b929a]">
            Скины, кейсы, промокоды и управление пользователями
          </p>
        </header>

        {(message || error) && (
          <div
            className={`mb-6 rounded-md border px-4 py-3 text-sm ${
              error
                ? "border-red-900/60 bg-red-950/40 text-red-200"
                : "border-emerald-900/60 bg-emerald-950/40 text-emerald-200"
            }`}
          >
            {error ?? message}
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-1 border-b border-[#2a2f38]">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-[#5b8def] text-white"
                  : "text-[#8b929a] hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-[#8b929a]">Загрузка данных из базы...</p>
        ) : activeTab === "skins" ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_1fr]">
            <form
              onSubmit={handleAddSkin}
              className="space-y-4 rounded-lg border border-[#2a2f38] bg-[#161a21] p-5"
            >
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8b929a]">
                Новый скин
              </h2>

              <label className="block space-y-1.5 text-sm">
                <span className="text-[#8b929a]">Название</span>
                <input
                  required
                  disabled={submitting}
                  value={skinForm.name}
                  onChange={(e) => setSkinForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-md border border-[#2a2f38] bg-[#0f1115] px-3 py-2 outline-none focus:border-[#5b8def] disabled:opacity-50"
                  placeholder="AK-47 | Поток информации"
                />
              </label>

              <label className="block space-y-1.5 text-sm">
                <span className="text-[#8b929a]">Цена, ₽</span>
                <input
                  required
                  type="number"
                  min={0}
                  disabled={submitting}
                  value={skinForm.price}
                  onChange={(e) => setSkinForm((f) => ({ ...f, price: e.target.value }))}
                  className="w-full rounded-md border border-[#2a2f38] bg-[#0f1115] px-3 py-2 outline-none focus:border-[#5b8def] disabled:opacity-50"
                />
              </label>

              <label className="block space-y-1.5 text-sm">
                <span className="text-[#8b929a]">URL картинки</span>
                <input
                  required
                  type="url"
                  disabled={submitting}
                  value={skinForm.image}
                  onChange={(e) => setSkinForm((f) => ({ ...f, image: e.target.value }))}
                  className="w-full rounded-md border border-[#2a2f38] bg-[#0f1115] px-3 py-2 outline-none focus:border-[#5b8def] disabled:opacity-50"
                  placeholder="https://..."
                />
              </label>

              <label className="block space-y-1.5 text-sm">
                <span className="text-[#8b929a]">Редкость</span>
                <select
                  disabled={submitting}
                  value={skinForm.rarity}
                  onChange={(e) =>
                    setSkinForm((f) => ({ ...f, rarity: e.target.value as Rarity }))
                  }
                  className="w-full rounded-md border border-[#2a2f38] bg-[#0f1115] px-3 py-2 outline-none focus:border-[#5b8def] disabled:opacity-50"
                >
                  {RARITIES.map((rarity) => (
                    <option key={rarity} value={rarity}>
                      {rarityConfig[rarity].label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-[#5b8def] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a7ad4] disabled:opacity-50"
              >
                {submitting ? "Сохранение..." : "Добавить скин"}
              </button>
            </form>

            <div className="overflow-hidden rounded-lg border border-[#2a2f38]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#161a21] text-[#8b929a]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Скин</th>
                    <th className="px-4 py-3 font-medium">Редкость</th>
                    <th className="px-4 py-3 font-medium">Цена</th>
                    <th className="px-4 py-3 font-medium text-right">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {skins.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-[#8b929a]">
                        Скинов пока нет
                      </td>
                    </tr>
                  ) : (
                    skins.map((skin) => (
                      <tr key={skin.id} className="border-t border-[#2a2f38]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <RemoteImage
                              src={skin.image}
                              alt={skin.name}
                              className="h-10 w-10 rounded object-cover bg-[#0f1115]"
                            />
                            <span>{skin.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {rarityConfig[skin.rarity as Rarity]?.label ?? skin.rarity}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {skin.price.toLocaleString("ru-RU")} ₽
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            disabled={deletingSkinId === skin.id || submitting}
                            onClick={() => handleDeleteSkin(skin.id)}
                            className="rounded-md border border-red-900/50 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-950/50 disabled:opacity-50"
                          >
                            {deletingSkinId === skin.id ? "Удаление..." : "Удалить"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === "cases" ? (
          <div className="space-y-8">
            <form
              onSubmit={handleCreateCase}
              className="space-y-6 rounded-lg border border-[#2a2f38] bg-[#161a21] p-5"
            >
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8b929a]">
                Новый кейс
              </h2>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block space-y-1.5 text-sm">
                  <span className="text-[#8b929a]">Название</span>
                  <input
                    required
                    disabled={submitting}
                    value={caseForm.name}
                    onChange={(e) => setCaseForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-md border border-[#2a2f38] bg-[#0f1115] px-3 py-2 outline-none focus:border-[#5b8def] disabled:opacity-50"
                  />
                </label>
                <label className="block space-y-1.5 text-sm">
                  <span className="text-[#8b929a]">Цена открытия, ₽</span>
                  <input
                    required
                    type="number"
                    min={0}
                    disabled={submitting}
                    value={caseForm.price}
                    onChange={(e) => setCaseForm((f) => ({ ...f, price: e.target.value }))}
                    className="w-full rounded-md border border-[#2a2f38] bg-[#0f1115] px-3 py-2 outline-none focus:border-[#5b8def] disabled:opacity-50"
                  />
                </label>
                <label className="block space-y-1.5 text-sm">
                  <span className="text-[#8b929a]">Обложка (URL https://…)</span>
                  <input
                    required
                    type="url"
                    inputMode="url"
                    placeholder="https://community.steamstatic.com/..."
                    disabled={submitting}
                    value={caseForm.image}
                    onChange={(e) => setCaseForm((f) => ({ ...f, image: e.target.value }))}
                    className="w-full rounded-md border border-[#2a2f38] bg-[#0f1115] px-3 py-2 outline-none focus:border-[#5b8def] disabled:opacity-50"
                  />
                  {caseForm.image && isInvalidStoredImageUrl(caseForm.image) && (
                    <span className="text-xs text-red-400">
                      Ссылка blob: не сохранится — вставьте прямой https-URL картинки
                    </span>
                  )}
                </label>
              </div>

              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-[#8b929a]">
                    Выберите скины и укажите шанс выпадения (%)
                  </p>
                  {Object.keys(selectedSkins).length > 0 && (
                    <p
                      className={`text-sm font-medium ${
                        dropChanceValid ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      Сумма шансов: {dropChanceTotal.toFixed(2)}%
                      {dropChanceValid ? " ✓" : " (нужно 100%)"}
                    </p>
                  )}
                </div>

                {skins.length === 0 ? (
                  <p className="text-sm text-[#8b929a]">
                    Сначала добавьте скины во вкладке «База скинов»
                  </p>
                ) : (
                  <div
                    className={`max-h-80 space-y-2 overflow-y-auto rounded-md border p-3 ${
                      Object.keys(selectedSkins).length > 0 && !dropChanceValid
                        ? "border-red-800/60 bg-red-950/10"
                        : "border-[#2a2f38]"
                    }`}
                  >
                    {skins.map((skin) => {
                      const selected = selectedSkins[skin.id]
                      return (
                        <div
                          key={skin.id}
                          className="flex flex-wrap items-center gap-3 rounded-md bg-[#0f1115] px-3 py-2"
                        >
                          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={Boolean(selected)}
                              onChange={() => toggleSkinSelection(skin.id)}
                              className="rounded border-[#2a2f38]"
                            />
                            <span className="truncate text-sm">{skin.name}</span>
                          </label>
                          {selected && (
                            <label className="flex items-center gap-2 text-sm">
                              <span className="text-[#8b929a]">Шанс %</span>
                              <input
                                type="number"
                                min={0.01}
                                max={100}
                                step={0.01}
                                required
                                value={selected.dropChance}
                                onChange={(e) =>
                                  updateDropChance(skin.id, e.target.value)
                                }
                                className="w-24 rounded-md border border-[#2a2f38] bg-[#161a21] px-2 py-1 outline-none focus:border-[#5b8def]"
                              />
                            </label>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={
                  submitting || skins.length === 0 || !dropChanceValid
                }
                className="rounded-md bg-[#5b8def] px-5 py-2 text-sm font-medium text-white hover:bg-[#4a7ad4] disabled:opacity-50"
              >
                {submitting ? "Создание..." : "Создать кейс"}
              </button>
            </form>

            <div className="overflow-hidden rounded-lg border border-[#2a2f38]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#161a21] text-[#8b929a]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Кейс</th>
                    <th className="px-4 py-3 font-medium">Цена</th>
                    <th className="px-4 py-3 font-medium">Скинов</th>
                    <th className="px-4 py-3 font-medium">Сумма шансов</th>
                    <th className="px-4 py-3 font-medium text-right">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-[#8b929a]">
                        Кейсов пока нет
                      </td>
                    </tr>
                  ) : (
                    cases.map((caseItem) => {
                      const total = caseItem.items.reduce(
                        (sum, item) => sum + item.dropChance,
                        0
                      )
                      return (
                        <tr key={caseItem.id} className="border-t border-[#2a2f38]">
                          <td className="px-4 py-3">{caseItem.name}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {caseItem.price.toLocaleString("ru-RU")} ₽
                          </td>
                          <td className="px-4 py-3">{caseItem.items.length}</td>
                          <td className="px-4 py-3">{total.toFixed(2)}%</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleCase(caseItem.id, caseItem.isActive)
                                }
                                className="rounded border border-[#2a2f38] px-2 py-1 text-xs hover:bg-[#1a1d24]"
                              >
                                {caseItem.isActive ? "Скрыть" : "Показать"}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteCase(caseItem.id, caseItem.name)
                                }
                                className="rounded border border-red-900/50 px-2 py-1 text-xs text-red-300 hover:bg-red-950/40"
                              >
                                Удалить
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === "promocodes" ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_1fr]">
            <form
              onSubmit={handleCreatePromocode}
              className="space-y-4 rounded-lg border border-[#2a2f38] bg-[#161a21] p-5"
            >
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8b929a]">
                Новый промокод
              </h2>

              <label className="block space-y-1.5 text-sm">
                <span className="text-[#8b929a]">Код</span>
                <input
                  required
                  disabled={submitting}
                  value={promoForm.code}
                  onChange={(e) =>
                    setPromoForm((f) => ({
                      ...f,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  className="w-full rounded-md border border-[#2a2f38] bg-[#0f1115] px-3 py-2 font-mono uppercase outline-none focus:border-[#5b8def] disabled:opacity-50"
                  placeholder="BONUS500"
                />
              </label>

              <label className="block space-y-1.5 text-sm">
                <span className="text-[#8b929a]">Тип бонуса</span>
                <select
                  disabled={submitting}
                  value={promoForm.bonusType}
                  onChange={(e) =>
                    setPromoForm((f) => ({
                      ...f,
                      bonusType: e.target.value as "BALANCE" | "DEPOSIT_PERCENT",
                    }))
                  }
                  className="w-full rounded-md border border-[#2a2f38] bg-[#0f1115] px-3 py-2 outline-none focus:border-[#5b8def] disabled:opacity-50"
                >
                  <option value="BALANCE">Фикс. сумма на баланс (₽)</option>
                  <option value="DEPOSIT_PERCENT">+% к пополнению</option>
                </select>
              </label>

              <label className="block space-y-1.5 text-sm">
                <span className="text-[#8b929a]">
                  {promoForm.bonusType === "BALANCE"
                    ? "Сумма бонуса, ₽"
                    : "Процент к пополнению, %"}
                </span>
                <input
                  required
                  type="number"
                  min={1}
                  step={promoForm.bonusType === "BALANCE" ? 1 : 0.1}
                  disabled={submitting}
                  value={promoForm.bonusValue}
                  onChange={(e) =>
                    setPromoForm((f) => ({ ...f, bonusValue: e.target.value }))
                  }
                  className="w-full rounded-md border border-[#2a2f38] bg-[#0f1115] px-3 py-2 outline-none focus:border-[#5b8def] disabled:opacity-50"
                />
              </label>

              <label className="block space-y-1.5 text-sm">
                <span className="text-[#8b929a]">Кол-во использований</span>
                <input
                  required
                  type="number"
                  min={1}
                  step={1}
                  disabled={submitting}
                  value={promoForm.maxUses}
                  onChange={(e) =>
                    setPromoForm((f) => ({ ...f, maxUses: e.target.value }))
                  }
                  className="w-full rounded-md border border-[#2a2f38] bg-[#0f1115] px-3 py-2 outline-none focus:border-[#5b8def] disabled:opacity-50"
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-[#5b8def] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a7ad4] disabled:opacity-50"
              >
                {submitting ? "Создание..." : "Создать промокод"}
              </button>
            </form>

            <div className="overflow-hidden rounded-lg border border-[#2a2f38]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#161a21] text-[#8b929a]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Код</th>
                    <th className="px-4 py-3 font-medium">Бонус</th>
                    <th className="px-4 py-3 font-medium">Использовано</th>
                    <th className="px-4 py-3 font-medium">Статус</th>
                    <th className="px-4 py-3 font-medium text-right">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {promocodes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-[#8b929a]">
                        Промокодов пока нет
                      </td>
                    </tr>
                  ) : (
                    promocodes.map((promo) => (
                      <tr key={promo.id} className="border-t border-[#2a2f38]">
                        <td className="px-4 py-3 font-mono font-medium">{promo.code}</td>
                        <td className="px-4 py-3">{formatPromoBonus(promo)}</td>
                        <td className="px-4 py-3">
                          {promo.usedCount} / {promo.maxUses}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded px-2 py-0.5 text-xs ${
                              promo.isActive
                                ? "bg-emerald-950/60 text-emerald-300"
                                : "bg-[#2a2f38] text-[#8b929a]"
                            }`}
                          >
                            {promo.isActive ? "Активен" : "Выключен"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeletePromocode(promo.id, promo.code)}
                            className="rounded border border-red-900/50 px-2 py-1 text-xs text-red-300 hover:bg-red-950/40"
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[#2a2f38]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#161a21] text-[#8b929a]">
                <tr>
                  <th className="px-4 py-3 font-medium">Пользователь</th>
                  <th className="px-4 py-3 font-medium">Роль</th>
                  <th className="px-4 py-3 font-medium">Баланс</th>
                  <th className="px-4 py-3 font-medium">Режим удачи</th>
                  <th className="px-4 py-3 font-medium text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[#8b929a]">
                      Пользователей нет. Запустите{" "}
                      <code className="rounded bg-[#0f1115] px-1">npm run db:seed</code>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-t border-[#2a2f38]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt=""
                              className="h-9 w-9 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2a2f38] text-xs">
                              {user.displayName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{user.displayName}</p>
                            <p className="text-xs text-[#8b929a]">@{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-xs capitalize ${
                            user.role === "admin"
                              ? "bg-amber-950/50 text-amber-300"
                              : "bg-[#2a2f38] text-[#8b929a]"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            step={1}
                            disabled={updatingUserId === user.id}
                            value={balanceDrafts[user.id] ?? String(user.balance)}
                            onChange={(e) =>
                              setBalanceDrafts((prev) => ({
                                ...prev,
                                [user.id]: e.target.value,
                              }))
                            }
                            className="w-28 rounded-md border border-[#2a2f38] bg-[#0f1115] px-2 py-1.5 outline-none focus:border-[#5b8def] disabled:opacity-50"
                          />
                          <span className="text-[#8b929a]">₽</span>
                          <button
                            type="button"
                            disabled={updatingUserId === user.id}
                            onClick={() => handleUpdateBalance(user.id)}
                            className="rounded-md bg-[#5b8def] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#4a7ad4] disabled:opacity-50"
                          >
                            {updatingUserId === user.id
                              ? "..."
                              : "Обновить баланс"}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          disabled={updatingUserId === user.id}
                          value={String(user.luckModifier)}
                          onChange={(e) =>
                            handleLuckChange(user.id, Number(e.target.value))
                          }
                          className="min-w-[180px] rounded-md border border-[#2a2f38] bg-[#0f1115] px-2 py-1.5 outline-none focus:border-[#5b8def] disabled:opacity-50"
                        >
                          {LUCK_MODIFIERS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {user.role !== "admin" ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteUser(user.id, user.displayName)
                            }
                            className="rounded border border-red-900/50 px-2 py-1 text-xs text-red-300 hover:bg-red-950/40"
                          >
                            Удалить
                          </button>
                        ) : (
                          <span className="text-xs text-[#8b929a]">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
