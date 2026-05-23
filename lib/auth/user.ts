import { prisma } from "@/lib/prisma"
import { getSessionUserId } from "@/lib/auth/session"
import { fetchSteamProfile, type SteamPlayerProfile } from "@/lib/auth/steam"
import type { PublicUser } from "@/lib/auth/types"

export type { PublicUser } from "@/lib/auth/types"

export function toPublicUser(user: {
  id: string
  username: string
  displayName: string
  role: string
  balance: number
  luckModifier: number
  avatar: string | null
  steamId: string | null
}): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    balance: user.balance,
    luckModifier: user.luckModifier,
    avatar: user.avatar,
    steamId: user.steamId,
  }
}

export async function findOrCreateSteamUser(
  profile: SteamPlayerProfile
): Promise<PublicUser> {
  const username = `steam_${profile.steamId}`

  const existing = await prisma.user.findUnique({
    where: { steamId: profile.steamId },
  })

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        displayName: profile.personaname,
        avatar: profile.avatarfull,
      },
    })
    return toPublicUser(updated)
  }

  const created = await prisma.user.create({
    data: {
      steamId: profile.steamId,
      username,
      displayName: profile.personaname,
      avatar: profile.avatarfull,
      role: "user",
      balance: 5000,
      luckModifier: 1.0,
    },
  })

  return toPublicUser(created)
}

/** Обновляет ник и аватар из Steam Web API (если задан STEAM_API_KEY). */
export async function syncSteamProfileFromApi(
  userId: string,
  steamId: string
): Promise<PublicUser | null> {
  if (!process.env.STEAM_API_KEY?.trim()) {
    return null
  }

  const profile = await fetchSteamProfile(steamId)
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      displayName: profile.personaname,
      avatar: profile.avatarfull,
    },
  })

  return toPublicUser(updated)
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const userId = await getSessionUserId()

  if (!userId) {
    return null
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) {
    return null
  }

  if (user.steamId && process.env.STEAM_API_KEY?.trim()) {
    const needsSync =
      !user.avatar ||
      user.displayName.startsWith("Steam_") ||
      user.displayName === `Steam_${user.steamId.slice(-6)}`

    if (needsSync) {
      try {
        const synced = await syncSteamProfileFromApi(user.id, user.steamId)
        if (synced) return synced
      } catch (error) {
        console.error("[auth] syncSteamProfileFromApi", error)
      }
    }
  }

  return toPublicUser(user)
}
