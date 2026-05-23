import { NextResponse } from "next/server"
import { getActiveCasesForFrontend } from "@/lib/cases"

export async function GET() {
  try {
    const cases = await getActiveCasesForFrontend()
    return NextResponse.json(cases)
  } catch (error) {
    console.error("[GET /api/cases]", error)
    return NextResponse.json(
      { error: "Не удалось загрузить кейсы" },
      { status: 500 }
    )
  }
}
