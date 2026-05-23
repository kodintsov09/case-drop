import { NextResponse } from "next/server"
import { mapSkinToFrontend } from "@/lib/db/mappers"
import { requireAuthUser } from "@/lib/game/require-user"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const user = await requireAuthUser()

    if (!user) {
      return NextResponse.json({ error: "Войдите через Steam" }, { status: 401 })
    }

    const minPrice = Number(new URL(request.url).searchParams.get("minPrice") ?? "0")

    const skins = await prisma.skin.findMany({
      where: {
        price: { gt: Math.max(0, minPrice) },
        image: { startsWith: "http" },
      },
      orderBy: { price: "asc" },
      take: 200,
    })

    return NextResponse.json(skins.map(mapSkinToFrontend))
  } catch (error) {
    console.error("[GET /api/upgrades/targets]", error)
    return NextResponse.json(
      { error: "Не удалось загрузить цели апгрейда" },
      { status: 500 }
    )
  }
}
