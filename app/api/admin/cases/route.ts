import { NextResponse } from "next/server"
import { getAllCasesForAdmin } from "@/lib/cases"
import { validateDropChanceSum } from "@/lib/admin/constants"
import { uniqueCaseSlug } from "@/lib/db/slug"
import {
  IMAGE_URL_VALIDATION_ERROR,
  isInvalidStoredImageUrl,
  normalizeImageUrl,
} from "@/lib/images"
import { prisma } from "@/lib/prisma"

type CaseItemInput = {
  skinId: string
  dropChance: number
}

type CreateCaseBody = {
  name?: string
  price?: number
  image?: string
  isActive?: boolean
  items?: CaseItemInput[]
}

export async function GET() {
  try {
    const cases = await getAllCasesForAdmin()
    return NextResponse.json(cases)
  } catch (error) {
    console.error("[GET /api/admin/cases]", error)
    return NextResponse.json(
      { error: "Не удалось загрузить кейсы" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateCaseBody
    const name = body.name?.trim()
    const imageRaw = body.image?.trim()
    const image = normalizeImageUrl(imageRaw)
    const price = Number(body.price)
    const items = body.items ?? []

    if (!name || !imageRaw || Number.isNaN(price) || price < 0) {
      return NextResponse.json(
        { error: "Укажите название, цену и обложку кейса" },
        { status: 400 }
      )
    }

    if (isInvalidStoredImageUrl(imageRaw) || !image) {
      return NextResponse.json({ error: IMAGE_URL_VALIDATION_ERROR }, { status: 400 })
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Добавьте хотя бы один скин в кейс" },
        { status: 400 }
      )
    }

    const skinIds = items.map((item) => item.skinId)
    const uniqueSkinIds = new Set(skinIds)
    if (uniqueSkinIds.size !== skinIds.length) {
      return NextResponse.json(
        { error: "Скины в кейсе не должны повторяться" },
        { status: 400 }
      )
    }

    const existingSkins = await prisma.skin.findMany({
      where: { id: { in: skinIds } },
      select: { id: true },
    })

    if (existingSkins.length !== skinIds.length) {
      return NextResponse.json(
        { error: "Один или несколько скинов не найдены" },
        { status: 400 }
      )
    }

    const normalizedItems = items.map((item) => ({
      skinId: item.skinId,
      dropChance: Number(item.dropChance),
    }))

    for (const item of normalizedItems) {
      if (Number.isNaN(item.dropChance) || item.dropChance <= 0 || item.dropChance > 100) {
        return NextResponse.json(
          { error: "Шанс выпадения каждого скина должен быть от 0.01% до 100%" },
          { status: 400 }
        )
      }
    }

    const { valid, total } = validateDropChanceSum(normalizedItems)
    if (!valid) {
      return NextResponse.json(
        {
          error: `Сумма шансов должна быть 100%. Сейчас: ${total}%`,
        },
        { status: 400 }
      )
    }

    const slug = await uniqueCaseSlug(name, async (candidate) => {
      const found = await prisma.case.findUnique({ where: { slug: candidate } })
      return Boolean(found)
    })

    const createdCase = await prisma.case.create({
      data: {
        name,
        slug,
        price: Math.round(price),
        image,
        isActive: body.isActive ?? true,
        items: {
          create: normalizedItems.map((item) => ({
            skinId: item.skinId,
            dropChance: item.dropChance,
          })),
        },
      },
      include: {
        items: { include: { skin: true } },
      },
    })

    return NextResponse.json(createdCase, { status: 201 })
  } catch (error) {
    console.error("[POST /api/admin/cases]", error)
    return NextResponse.json(
      { error: "Не удалось создать кейс" },
      { status: 500 }
    )
  }
}
