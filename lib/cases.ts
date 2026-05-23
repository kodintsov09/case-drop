import { prisma } from "@/lib/prisma"
import { mapCaseToFrontend } from "@/lib/db/mappers"
import type { CaseItem as FrontendCase } from "@/lib/case-battle"

const caseInclude = {
  items: {
    include: { skin: true },
    orderBy: { dropChance: "desc" as const },
  },
} as const

export async function getActiveCasesForFrontend(): Promise<FrontendCase[]> {
  const cases = await prisma.case.findMany({
    where: { isActive: true },
    include: caseInclude,
    orderBy: { createdAt: "desc" },
  })

  return cases.map((caseRecord, index) => mapCaseToFrontend(caseRecord, index))
}

export async function getAllCasesForAdmin() {
  return prisma.case.findMany({
    include: caseInclude,
    orderBy: { createdAt: "desc" },
  })
}

export async function getAllSkinsForAdmin() {
  return prisma.skin.findMany({
    orderBy: { createdAt: "desc" },
  })
}
