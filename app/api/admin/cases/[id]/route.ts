import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = (await request.json()) as { isActive?: boolean }

    const updated = await prisma.case.update({
      where: { id },
      data: { isActive: body.isActive },
      include: { items: { include: { skin: true } } },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[PATCH /api/admin/cases/[id]]", error)
    return NextResponse.json(
      { error: "Не удалось обновить кейс" },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params

    const caseRecord = await prisma.case.findUnique({ where: { id } })

    if (!caseRecord) {
      return NextResponse.json({ error: "Кейс не найден" }, { status: 404 })
    }

    await prisma.case.delete({ where: { id } })

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error("[DELETE /api/admin/cases/[id]]", error)
    return NextResponse.json(
      { error: "Не удалось удалить кейс" },
      { status: 500 }
    )
  }
}
