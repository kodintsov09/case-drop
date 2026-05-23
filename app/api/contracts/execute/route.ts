import { NextResponse } from "next/server"
import { toPublicUser } from "@/lib/auth/user"
import { mapSkinToFrontend } from "@/lib/db/mappers"
import { createLiveDrop, mapInventoryItem } from "@/lib/game/inventory"
import { pickContractRewardSkin } from "@/lib/game/rng"
import { requireAuthUser } from "@/lib/game/require-user"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

type ContractBody = {
  inventoryItemIds?: string[]
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthUser()

    if (!user) {
      return NextResponse.json({ error: "Войдите через Steam" }, { status: 401 })
    }

    const body = (await request.json()) as ContractBody
    const ids = body.inventoryItemIds ?? []

    if (ids.length < 3 || ids.length > 10) {
      return NextResponse.json(
        { error: "В контракте должно быть от 3 до 10 предметов" },
        { status: 400 }
      )
    }

    const uniqueIds = [...new Set(ids)]
    if (uniqueIds.length !== ids.length) {
      return NextResponse.json({ error: "Предметы не должны повторяться" }, { status: 400 })
    }

    const items = await prisma.inventoryItem.findMany({
      where: {
        id: { in: uniqueIds },
        userId: user.id,
        status: "AVAILABLE",
      },
      include: { skin: true },
    })

    if (items.length !== uniqueIds.length) {
      return NextResponse.json(
        { error: "Один или несколько предметов недоступны" },
        { status: 400 }
      )
    }

    const totalValue = items.reduce((sum, item) => sum + item.skin.price, 0)

    const rewardCandidates = await prisma.skin.findMany({
      where: {
        price: {
          gte: Math.max(1, Math.floor(totalValue * 0.3)),
          lte: Math.floor(totalValue * 4),
        },
        image: { startsWith: "http" },
      },
      take: 100,
    })

    const fallbackSkins = rewardCandidates.length
      ? rewardCandidates
      : await prisma.skin.findMany({
          where: { image: { startsWith: "http" } },
          orderBy: { price: "desc" },
          take: 50,
        })

    const rewardSkin = pickContractRewardSkin(fallbackSkins, totalValue)
    const contractNumber = Math.floor(10000 + Math.random() * 90000)

    const rewardItem = await prisma.$transaction(async (tx) => {
      await tx.inventoryItem.updateMany({
        where: { id: { in: uniqueIds } },
        data: { status: "CONTRACTED_AWAY" },
      })

      return tx.inventoryItem.create({
        data: {
          userId: user.id,
          skinId: rewardSkin.id,
          status: "AVAILABLE",
        },
        include: { skin: true },
      })
    })

    try {
      await createLiveDrop(user, rewardSkin)
    } catch (liveDropError) {
      console.error("[POST /api/contracts/execute] live drop", liveDropError)
    }

    return NextResponse.json({
      contractNumber,
      totalValue,
      minReward: Math.floor(totalValue * 0.5),
      maxReward: Math.floor(totalValue * 3.5),
      reward: mapInventoryItem(rewardItem),
      skin: mapSkinToFrontend(rewardSkin),
      user: toPublicUser(user),
      consumedCount: items.length,
    })
  } catch (error) {
    console.error("[POST /api/contracts/execute]", error)
    const detail = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? `Не удалось выполнить контракт: ${detail}`
            : "Не удалось выполнить контракт",
      },
      { status: 500 }
    )
  }
}
