import { NextResponse } from "next/server"
import { getAppUrl } from "@/lib/auth/config"
import { getSteamLoginUrl } from "@/lib/auth/steam"

export async function GET() {
  try {
    const loginUrl = getSteamLoginUrl()
    return NextResponse.redirect(loginUrl)
  } catch (error) {
    console.error("[GET /api/auth/steam]", error)
    return NextResponse.redirect(new URL("/?auth_error=config", getAppUrl()))
  }
}
