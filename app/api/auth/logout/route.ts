import { NextResponse } from "next/server"
import { getAppUrl } from "@/lib/auth/config"
import { destroySession } from "@/lib/auth/session"

export async function GET() {
  try {
    await destroySession()
    return NextResponse.redirect(new URL("/", getAppUrl()))
  } catch (error) {
    console.error("[GET /api/auth/logout]", error)
    return NextResponse.json({ error: "Не удалось выйти" }, { status: 500 })
  }
}

export async function POST() {
  try {
    await destroySession()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[POST /api/auth/logout]", error)
    return NextResponse.json({ error: "Не удалось выйти" }, { status: 500 })
  }
}
