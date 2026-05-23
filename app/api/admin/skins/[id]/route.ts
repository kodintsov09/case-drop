import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params

    if (!id?.trim()) {
      return NextResponse.json({ error: "Не указан ID скина" }, { status: 400 })
    }

    const existing = await prisma.skin.findUnique({ where: { id } })

    if (!existing) {
      return NextResponse.json({ error: "Скин не найден" }, { status: 404 })
    }

    await prisma.skin.delete({ where: { id } })

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error("[DELETE /api/admin/skins/[id]]", error)
    return NextResponse.json(
      { error: "Не удалось удалить скин" },
      { status: 500 }
    )
  }
}
