import { NextResponse } from "next/server"
import { LUCK_MODIFIERS } from "@/lib/admin/constants"
import { prisma } from "@/lib/prisma"

const ALLOWED_LUCK_VALUES = LUCK_MODIFIERS.map((item) => item.value)

type PatchUserBody = {
  id?: string
  balance?: number
  luckModifier?: number
}

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: [{ role: "desc" }, { createdAt: "asc" }],
    })
    return NextResponse.json(users)
  } catch (error) {
    console.error("[GET /api/admin/users]", error)
    return NextResponse.json(
      { error: "Не удалось загрузить пользователей" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as PatchUserBody
    const id = body.id?.trim()

    if (!id) {
      return NextResponse.json({ error: "Не указан ID пользователя" }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }

    const data: { balance?: number; luckModifier?: number } = {}

    if (body.balance !== undefined) {
      const balance = Number(body.balance)
      if (Number.isNaN(balance) || balance < 0 || !Number.isInteger(balance)) {
        return NextResponse.json(
          { error: "Баланс должен быть целым числом ≥ 0" },
          { status: 400 }
        )
      }
      data.balance = balance
    }

    if (body.luckModifier !== undefined) {
      const luckModifier = Number(body.luckModifier)
      const isAllowed = ALLOWED_LUCK_VALUES.some(
        (value) => Math.abs(value - luckModifier) < 0.001
      )
      if (!isAllowed) {
        return NextResponse.json(
          { error: "Недопустимый режим удачи" },
          { status: 400 }
        )
      }
      data.luckModifier = luckModifier
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Укажите balance или luckModifier для обновления" },
        { status: 400 }
      )
    }

    const user = await prisma.user.update({
      where: { id },
      data,
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("[PATCH /api/admin/users]", error)
    return NextResponse.json(
      { error: "Не удалось обновить пользователя" },
      { status: 500 }
    )
  }
}
