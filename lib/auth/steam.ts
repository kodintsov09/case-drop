import { getAppUrl } from "@/lib/auth/config"

const STEAM_OPENID_ENDPOINT = "https://steamcommunity.com/openid/login"

export function getSteamLoginUrl(): string {
  const returnUrl = `${getAppUrl()}/api/auth/steam/callback`
  const realm = getAppUrl()

  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnUrl,
    "openid.realm": realm,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  })

  return `${STEAM_OPENID_ENDPOINT}?${params.toString()}`
}

export async function verifySteamCallback(
  searchParams: URLSearchParams
): Promise<string | null> {
  const mode = searchParams.get("openid.mode")

  if (mode !== "id_res") {
    return null
  }

  const claimedId = searchParams.get("openid.claimed_id")
  const steamIdMatch = claimedId?.match(
    /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/
  )

  if (!steamIdMatch) {
    return null
  }

  const verifyBody = new URLSearchParams()

  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith("openid.")) {
      verifyBody.set(key, value)
    }
  }

  verifyBody.set("openid.mode", "check_authentication")

  const response = await fetch(STEAM_OPENID_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: verifyBody.toString(),
  })

  const text = await response.text()

  if (!text.includes("is_valid:true")) {
    return null
  }

  return steamIdMatch[1]
}

export type SteamPlayerProfile = {
  steamId: string
  personaname: string
  avatarfull: string | null
}

type SteamPlayerSummary = {
  personaname?: string
  avatarfull?: string
  avatarmedium?: string
  avatar?: string
}

function pickAvatar(player?: SteamPlayerSummary): string | null {
  return player?.avatarfull ?? player?.avatarmedium ?? player?.avatar ?? null
}

export async function fetchSteamProfile(
  steamId: string
): Promise<SteamPlayerProfile> {
  const apiKey = process.env.STEAM_API_KEY?.trim()
  const fallbackName = `Steam_${steamId.slice(-6)}`

  if (!apiKey) {
    return { steamId, personaname: fallbackName, avatarfull: null }
  }

  const url = new URL(
    "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/"
  )
  url.searchParams.set("key", apiKey)
  url.searchParams.set("steamids", steamId)

  try {
    const response = await fetch(url.toString(), { cache: "no-store" })

    if (!response.ok) {
      console.error("[steam] GetPlayerSummaries HTTP", response.status)
      return { steamId, personaname: fallbackName, avatarfull: null }
    }

    const data = (await response.json()) as {
      response?: { players?: SteamPlayerSummary[] }
    }

    const player = data.response?.players?.[0]

    if (!player) {
      console.warn("[steam] No player in API response for", steamId)
      return { steamId, personaname: fallbackName, avatarfull: null }
    }

    return {
      steamId,
      personaname: player.personaname?.trim() || fallbackName,
      avatarfull: pickAvatar(player),
    }
  } catch (error) {
    console.error("[steam] GetPlayerSummaries failed", error)
    return { steamId, personaname: fallbackName, avatarfull: null }
  }
}
