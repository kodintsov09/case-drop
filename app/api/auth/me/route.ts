import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/user"

export const runtime = "nodejs"

export async function GET() {
  try {
    const user = await getCurrentUser()
    return NextResponse.json({ user })
  } catch (error) {
    console.error("[GET /api/auth/me]", error)
    return NextResponse.json(
      { error: "Не удалось получить профиль", user: null },
      { status: 500 }
    )
  }
}
