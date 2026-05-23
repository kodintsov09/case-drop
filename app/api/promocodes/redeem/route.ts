import { NextResponse } from "next/server"
import { toPublicUser } from "@/lib/auth/user"
import { requireAuthUser } from "@/lib/game/require-user"
import { prisma } from "@/lib/prisma"

type RedeemBody = {
  code?: string
  depositAmount?: number
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthUser()

    if (!user) {
      return NextResponse.json({ error: "Войдите через Steam" }, { status: 401 })
    }

    const body = (await request.json()) as RedeemBody
    const code = body.code?.trim().toUpperCase()
    const depositAmount = Number(body.depositAmount ?? 0)

    if (!code) {
      return NextResponse.json({ error: "Введите промокод" }, { status: 400 })
    }

    const promocode = await prisma.promocode.findUnique({ where: { code } })

    if (!promocode || !promocode.isActive) {
      return NextResponse.json({ error: "Промокод не найден или неактивен" }, { status: 404 })
    }

    if (promocode.usedCount >= promocode.maxUses) {
      return NextResponse.json({ error: "Промокод исчерпан" }, { status: 400 })
    }

    const alreadyUsed = await prisma.promocodeRedemption.findUnique({
      where: {
        userId_promocodeId: {
          userId: user.id,
          promocodeId: promocode.id,
        },
      },
    })

    if (alreadyUsed) {
      return NextResponse.json({ error: "Вы уже использовали этот промокод" }, { status: 400 })
    }

    let bonus = 0

    if (promocode.bonusType === "BALANCE") {
      bonus = Math.round(promocode.bonusValue)
    } else if (promocode.bonusType === "DEPOSIT_PERCENT") {
      if (depositAmount <= 0) {
        return NextResponse.json(
          { error: "Для этого промокода укажите сумму пополнения" },
          { status: 400 }
        )
      }
      bonus = Math.round((depositAmount * promocode.bonusValue) / 100)
    } else {
      return NextResponse.json({ error: "Неизвестный тип промокода" }, { status: 400 })
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      await tx.promocodeRedemption.create({
        data: { userId: user.id, promocodeId: promocode.id },
      })

      await tx.promocode.update({
        where: { id: promocode.id },
        data: { usedCount: { increment: 1 } },
      })

      return tx.user.update({
        where: { id: user.id },
        data: { balance: { increment: bonus } },
      })
    })

    return NextResponse.json({
      bonus,
      message:
        promocode.bonusType === "BALANCE"
          ? `+${bonus.toLocaleString("ru-RU")} ₽ на баланс`
          : `Бонус +${bonus.toLocaleString("ru-RU")} ₽ к пополнению`,
      user: toPublicUser(updatedUser),
    })
  } catch (error) {
    console.error("[POST /api/promocodes/redeem]", error)
    return NextResponse.json(
      { error: "Не удалось применить промокод" },
      { status: 500 }
    )
  }
}
