import { NextRequest, NextResponse } from "next/server"
import { getAppUrl } from "@/lib/auth/config"
import { attachSessionCookie, signSessionToken } from "@/lib/auth/session"
import { fetchSteamProfile, verifySteamCallback } from "@/lib/auth/steam"
import { findOrCreateSteamUser } from "@/lib/auth/user"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const appUrl = getAppUrl()

  try {
    const searchParams = request.nextUrl.searchParams
    const steamId = await verifySteamCallback(searchParams)

    if (!steamId) {
      console.error("[steam/callback] OpenID verification failed")
      return NextResponse.redirect(
        new URL("/?auth_error=steam_verify_failed", appUrl)
      )
    }

    const profile = await fetchSteamProfile(steamId)
    const user = await findOrCreateSteamUser(profile)
    const token = await signSessionToken(user.id)

    const response = NextResponse.redirect(new URL("/?auth_success=1", appUrl))
    attachSessionCookie(response, token)

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[GET /api/auth/steam/callback]", error)

    const redirectUrl = new URL("/", appUrl)
    redirectUrl.searchParams.set("auth_error", "server")
    if (process.env.NODE_ENV !== "production") {
      redirectUrl.searchParams.set("auth_detail", message.slice(0, 200))
    }

    return NextResponse.redirect(redirectUrl)
  }
}
