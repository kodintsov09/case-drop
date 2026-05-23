import { NextResponse } from "next/server"
import { toPublicUser } from "@/lib/auth/user"
import { mapSkinToFrontend } from "@/lib/db/mappers"
import { createLiveDrop, mapInventoryItem } from "@/lib/game/inventory"
import { rollUpgrade } from "@/lib/game/rng"
import { requireAuthUser } from "@/lib/game/require-user"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

type UpgradeBody = {
  inventoryItemId?: string
  targetSkinId?: string
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthUser()

    if (!user) {
      return NextResponse.json({ error: "Войдите через Steam" }, { status: 401 })
    }

    const body = (await request.json()) as UpgradeBody
    const inventoryItemId = body.inventoryItemId?.trim()
    const targetSkinId = body.targetSkinId?.trim()

    if (!inventoryItemId || !targetSkinId) {
      return NextResponse.json(
        { error: "Укажите предмет и цель апгрейда" },
        { status: 400 }
      )
    }

    const [inputItem, targetSkin] = await Promise.all([
      prisma.inventoryItem.findFirst({
        where: { id: inventoryItemId, userId: user.id, status: "AVAILABLE" },
        include: { skin: true },
      }),
      prisma.skin.findUnique({ where: { id: targetSkinId } }),
    ])

    if (!inputItem) {
      return NextResponse.json({ error: "Предмет не найден" }, { status: 404 })
    }

    if (!targetSkin) {
      return NextResponse.json({ error: "Целевой скин не найден" }, { status: 404 })
    }

    if (targetSkin.price <= inputItem.skin.price) {
      return NextResponse.json(
        { error: "Цель должна быть дороже вашего предмета" },
        { status: 400 }
      )
    }

    const { success, winChance, pointerStopDeg } = rollUpgrade(
      inputItem.skin.price,
      targetSkin.price,
      user.luckModifier
    )

    if (success) {
      const result = await prisma.$transaction(async (tx) => {
        await tx.inventoryItem.update({
          where: { id: inputItem.id },
          data: { status: "UPGRADED_AWAY" },
        })

        const rewardItem = await tx.inventoryItem.create({
          data: {
            userId: user.id,
            skinId: targetSkin.id,
            status: "AVAILABLE",
          },
          include: { skin: true },
        })

        return rewardItem
      })

      try {
        await createLiveDrop(user, targetSkin)
      } catch (liveDropError) {
        console.error("[POST /api/upgrades/attempt] live drop", liveDropError)
      }

      return NextResponse.json({
        success: true,
        winChance,
        pointerStopDeg,
        reward: mapInventoryItem(result),
        skin: mapSkinToFrontend(targetSkin),
        user: toPublicUser(user),
      })
    }

    await prisma.inventoryItem.update({
      where: { id: inputItem.id },
      data: { status: "UPGRADED_AWAY" },
    })

    return NextResponse.json({
      success: false,
      winChance,
      pointerStopDeg,
      consumedInventoryItemId: inputItem.id,
      user: toPublicUser(user),
    })
  } catch (error) {
    console.error("[POST /api/upgrades/attempt]", error)
    const detail = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? `Не удалось выполнить апгрейд: ${detail}`
            : "Не удалось выполнить апгрейд",
      },
      { status: 500 }
    )
  }
}
