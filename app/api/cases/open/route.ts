import { NextResponse } from "next/server"
import { toPublicUser } from "@/lib/auth/user"
import { mapSkinToFrontend } from "@/lib/db/mappers"
import { createLiveDrop, mapInventoryItem } from "@/lib/game/inventory"
import { pickSkinFromCase } from "@/lib/game/rng"
import { requireAuthUser } from "@/lib/game/require-user"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

type OpenCaseBody = {
  caseId?: string
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthUser()

    if (!user) {
      return NextResponse.json({ error: "Войдите через Steam" }, { status: 401 })
    }

    const body = (await request.json()) as OpenCaseBody
    const caseId = body.caseId?.trim()

    if (!caseId) {
      return NextResponse.json({ error: "Не указан кейс" }, { status: 400 })
    }

    const caseRecord = await prisma.case.findFirst({
      where: { id: caseId, isActive: true },
      include: { items: { include: { skin: true } } },
    })

    if (!caseRecord || caseRecord.items.length === 0) {
      return NextResponse.json({ error: "Кейс не найден или пуст" }, { status: 404 })
    }

    if (user.balance < caseRecord.price) {
      return NextResponse.json({ error: "Недостаточно средств" }, { status: 400 })
    }

    const wonItem = pickSkinFromCase(caseRecord.items, user.luckModifier)
    const wonSkin = wonItem.skin

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { balance: { decrement: caseRecord.price } },
      })

      const inventoryItem = await tx.inventoryItem.create({
        data: {
          userId: user.id,
          skinId: wonSkin.id,
          status: "AVAILABLE",
        },
        include: { skin: true },
      })

      await tx.caseOpening.create({
        data: {
          userId: user.id,
          caseId: caseRecord.id,
          skinId: wonSkin.id,
          inventoryItemId: inventoryItem.id,
          casePrice: caseRecord.price,
        },
      })

      return { updatedUser, inventoryItem }
    })

    try {
      await createLiveDrop(user, wonSkin)
    } catch (liveDropError) {
      console.error("[POST /api/cases/open] live drop", liveDropError)
    }

    return NextResponse.json({
      skin: mapSkinToFrontend(wonSkin),
      inventoryItem: mapInventoryItem(result.inventoryItem),
      user: toPublicUser(result.updatedUser),
      caseName: caseRecord.name,
    })
  } catch (error) {
    console.error("[POST /api/cases/open]", error)
    const detail = error instanceof Error ? error.message : String(error)
    const message =
      detail.includes("NODE_MODULE_VERSION") || detail.includes("ERR_DLOPEN_FAILED")
        ? "Ошибка базы данных. Перезапустите dev-сервер (npm run dev)."
        : process.env.NODE_ENV === "development"
          ? `Не удалось открыть кейс: ${detail}`
          : "Не удалось открыть кейс"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
