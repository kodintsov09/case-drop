import { NextResponse } from "next/server"
import { mapInventoryItem } from "@/lib/game/inventory"
import { requireAuthUser } from "@/lib/game/require-user"
import { toPublicUser } from "@/lib/auth/user"
import { prisma } from "@/lib/prisma"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_request: Request, context: RouteContext) {
  try {
    const user = await requireAuthUser()

    if (!user) {
      return NextResponse.json({ error: "Войдите через Steam" }, { status: 401 })
    }

    const { id } = await context.params

    const item = await prisma.inventoryItem.findFirst({
      where: { id, userId: user.id, status: "AVAILABLE" },
      include: { skin: true },
    })

    if (!item) {
      return NextResponse.json({ error: "Предмет не найден" }, { status: 404 })
    }

    const sellPrice = Math.floor(item.skin.price * 0.9)

    const [updatedItem, updatedUser] = await prisma.$transaction([
      prisma.inventoryItem.update({
        where: { id: item.id },
        data: { status: "SOLD" },
        include: { skin: true },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { balance: { increment: sellPrice } },
      }),
    ])

    return NextResponse.json({
      sold: mapInventoryItem(updatedItem),
      sellPrice,
      user: toPublicUser(updatedUser),
    })
  } catch (error) {
    console.error("[POST /api/inventory/[id]/sell]", error)
    return NextResponse.json(
      { error: "Не удалось продать предмет" },
      { status: 500 }
    )
  }
}
