import { NextResponse } from "next/server"
import { getAllSkinsForAdmin } from "@/lib/cases"
import {
  RARITIES,
  WEAPON_TYPES,
  inferWeaponTypeFromName,
} from "@/lib/admin/constants"
import {
  IMAGE_URL_VALIDATION_ERROR,
  isInvalidStoredImageUrl,
  normalizeImageUrl,
} from "@/lib/images"
import { prisma } from "@/lib/prisma"
import type { Rarity, WeaponType } from "@/lib/case-battle"

type CreateSkinBody = {
  name?: string
  price?: number
  image?: string
  rarity?: string
  weaponType?: string
}

export async function GET() {
  try {
    const skins = await getAllSkinsForAdmin()
    return NextResponse.json(skins)
  } catch (error) {
    console.error("[GET /api/admin/skins]", error)
    return NextResponse.json(
      { error: "Не удалось загрузить скины" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateSkinBody
    const name = body.name?.trim()
    const imageRaw = body.image?.trim()
    const image = normalizeImageUrl(imageRaw)
    const price = Number(body.price)
    const rarity = body.rarity?.trim() ?? "milspec"
    const weaponType =
      body.weaponType?.trim() ?? inferWeaponTypeFromName(name ?? "")

    if (!name || !imageRaw || Number.isNaN(price) || price < 0) {
      return NextResponse.json(
        { error: "Укажите название, цену и ссылку на изображение" },
        { status: 400 }
      )
    }

    if (isInvalidStoredImageUrl(imageRaw) || !image) {
      return NextResponse.json({ error: IMAGE_URL_VALIDATION_ERROR }, { status: 400 })
    }

    if (!RARITIES.includes(rarity as Rarity)) {
      return NextResponse.json({ error: "Некорректная редкость" }, { status: 400 })
    }

    if (!WEAPON_TYPES.includes(weaponType as WeaponType)) {
      return NextResponse.json({ error: "Некорректный тип оружия" }, { status: 400 })
    }

    const skin = await prisma.skin.create({
      data: {
        name,
        price: Math.round(price),
        image,
        rarity,
        weaponType,
      },
    })

    return NextResponse.json(skin, { status: 201 })
  } catch (error) {
    console.error("[POST /api/admin/skins]", error)
    return NextResponse.json(
      { error: "Не удалось создать скин" },
      { status: 500 }
    )
  }
}
