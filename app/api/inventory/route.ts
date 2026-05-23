import { NextResponse } from "next/server"
import { getAvailableInventory } from "@/lib/game/inventory"
import { requireAuthUser } from "@/lib/game/require-user"

export const runtime = "nodejs"

export async function GET() {
  try {
    const user = await requireAuthUser()

    if (!user) {
      return NextResponse.json({ error: "Войдите через Steam" }, { status: 401 })
    }

    const items = await getAvailableInventory(user.id)
    return NextResponse.json(items)
  } catch (error) {
    console.error("[GET /api/inventory]", error)
    return NextResponse.json(
      { error: "Не удалось загрузить инвентарь" },
      { status: 500 }
    )
  }
}
