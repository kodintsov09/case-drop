import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type RouteContext = { params: Promise<{ id: string }> }

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ error: "Не указан ID" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id } })

    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }

    if (user.role === "admin") {
      return NextResponse.json(
        { error: "Нельзя удалить администратора" },
        { status: 400 }
      )
    }

    await prisma.user.delete({ where: { id } })

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error("[DELETE /api/admin/users/[id]]", error)
    return NextResponse.json(
      { error: "Не удалось удалить пользователя" },
      { status: 500 }
    )
  }
}
