import { NextResponse } from "next/server"
import { PROMO_BONUS_TYPES, type PromoBonusType } from "@/lib/admin/constants"
import { prisma } from "@/lib/prisma"

type CreatePromocodeBody = {
  code?: string
  bonusType?: string
  bonusValue?: number
  maxUses?: number
  isActive?: boolean
}

export async function GET() {
  try {
    const promocodes = await prisma.promocode.findMany({
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(promocodes)
  } catch (error) {
    console.error("[GET /api/admin/promocodes]", error)
    return NextResponse.json(
      { error: "Не удалось загрузить промокоды" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreatePromocodeBody
    const code = body.code?.trim().toUpperCase()
    const bonusType = body.bonusType?.trim().toUpperCase() as PromoBonusType
    const bonusValue = Number(body.bonusValue)
    const maxUses = Number(body.maxUses)

    if (!code || code.length < 3) {
      return NextResponse.json(
        { error: "Код промо должен содержать минимум 3 символа" },
        { status: 400 }
      )
    }

    if (!PROMO_BONUS_TYPES.includes(bonusType)) {
      return NextResponse.json(
        { error: "Тип бонуса: BALANCE (фикс. ₽) или DEPOSIT_PERCENT (+% к пополнению)" },
        { status: 400 }
      )
    }

    if (Number.isNaN(bonusValue) || bonusValue <= 0) {
      return NextResponse.json(
        { error: "Укажите корректное значение бонуса" },
        { status: 400 }
      )
    }

    if (bonusType === "DEPOSIT_PERCENT" && bonusValue > 500) {
      return NextResponse.json(
        { error: "Процент к пополнению не может превышать 500%" },
        { status: 400 }
      )
    }

    if (Number.isNaN(maxUses) || maxUses < 1 || !Number.isInteger(maxUses)) {
      return NextResponse.json(
        { error: "Количество использований должно быть целым числом ≥ 1" },
        { status: 400 }
      )
    }

    const existing = await prisma.promocode.findUnique({ where: { code } })
    if (existing) {
      return NextResponse.json(
        { error: "Промокод с таким кодом уже существует" },
        { status: 409 }
      )
    }

    const promocode = await prisma.promocode.create({
      data: {
        code,
        bonusType,
        bonusValue,
        maxUses: Math.round(maxUses),
        isActive: body.isActive ?? true,
      },
    })

    return NextResponse.json(promocode, { status: 201 })
  } catch (error) {
    console.error("[POST /api/admin/promocodes]", error)
    return NextResponse.json(
      { error: "Не удалось создать промокод" },
      { status: 500 }
    )
  }
}
