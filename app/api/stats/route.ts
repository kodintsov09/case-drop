import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const [userCount, openingsCount] = await Promise.all([
      prisma.user.count(),
      prisma.caseOpening.count(),
    ])

    const usersOnline = Math.max(userCount, 1) + 1200
    const casesOpened = openingsCount + 150000

    return NextResponse.json({ usersOnline, casesOpened })
  } catch (error) {
    console.error("[GET /api/stats]", error)
    return NextResponse.json(
      { usersOnline: 2847, casesOpened: 158432 },
      { status: 200 }
    )
  }
}
