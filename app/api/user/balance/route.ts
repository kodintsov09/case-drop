import { NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/auth/session"
import { toPublicUser } from "@/lib/auth/user"
import { prisma } from "@/lib/prisma"

type PatchBalanceBody = {
  delta?: number
  balance?: number
}

export async function PATCH(request: Request) {
  try {
    const userId = await getSessionUserId()

    if (!userId) {
      return NextResponse.json(
        { error: "Войдите через Steam" },
        { status: 401 }
      )
    }

    const body = (await request.json()) as PatchBalanceBody

    const existing = await prisma.user.findUnique({ where: { id: userId } })

    if (!existing) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }

    let nextBalance: number

    if (body.balance !== undefined) {
      const balance = Number(body.balance)
      if (Number.isNaN(balance) || balance < 0 || !Number.isInteger(balance)) {
        return NextResponse.json(
          { error: "Баланс должен быть целым числом ≥ 0" },
          { status: 400 }
        )
      }
      nextBalance = balance
    } else if (body.delta !== undefined) {
      const delta = Number(body.delta)
      if (Number.isNaN(delta) || !Number.isInteger(delta)) {
        return NextResponse.json(
          { error: "Изменение баланса должно быть целым числом" },
          { status: 400 }
        )
      }
      nextBalance = Math.max(0, existing.balance + delta)
    } else {
      return NextResponse.json(
        { error: "Укажите balance или delta" },
        { status: 400 }
      )
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { balance: nextBalance },
    })

    return NextResponse.json({ user: toPublicUser(user) })
  } catch (error) {
    console.error("[PATCH /api/user/balance]", error)
    return NextResponse.json(
      { error: "Не удалось обновить баланс" },
      { status: 500 }
    )
  }
}
