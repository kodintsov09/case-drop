import { NextResponse } from "next/server"
import { rarityConfig, type Rarity, type Winner } from "@/lib/case-battle"
import { prisma } from "@/lib/prisma"

const WEAPON_TYPES = ["rifle", "pistol", "knife", "awp"] as const

export async function GET(request: Request) {
  try {
    const limit = Math.min(
      50,
      Math.max(5, Number(new URL(request.url).searchParams.get("limit") ?? "25"))
    )

    const drops = await prisma.liveDrop.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    const winners: Winner[] = drops.map((drop) => {
      const rarity = (Object.keys(rarityConfig).includes(drop.rarity)
        ? drop.rarity
        : "milspec") as Rarity
      const weaponType = WEAPON_TYPES.includes(
        drop.weaponType as (typeof WEAPON_TYPES)[number]
      )
        ? (drop.weaponType as (typeof WEAPON_TYPES)[number])
        : "rifle"

      return {
        id: drop.id,
        username: drop.displayName || drop.username,
        avatar:
          drop.avatar ??
          "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff25dc1cdfb_full.jpg",
        skin: {
          id: drop.skinId,
          name: drop.skinName,
          weapon: drop.weaponLabel,
          wear: "—",
          rarity,
          price: drop.price,
          image: drop.image,
          weaponType,
        },
        timestamp: drop.createdAt.getTime(),
      }
    })

    return NextResponse.json(winners)
  } catch (error) {
    console.error("[GET /api/live-drops]", error)
    return NextResponse.json(
      { error: "Не удалось загрузить ленту дропов" },
      { status: 500 }
    )
  }
}
