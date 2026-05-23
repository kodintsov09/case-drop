import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type RouteContext = { params: Promise<{ id: string }> }

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ error: "Не указан ID" }, { status: 400 })
    }

    const promocode = await prisma.promocode.findUnique({ where: { id } })

    if (!promocode) {
      return NextResponse.json({ error: "Промокод не найден" }, { status: 404 })
    }

    await prisma.promocode.delete({ where: { id } })

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error("[DELETE /api/admin/promocodes/[id]]", error)
    return NextResponse.json(
      { error: "Не удалось удалить промокод" },
      { status: 500 }
    )
  }
}
