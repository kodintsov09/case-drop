import { Suspense } from "react"
import { CaseBattleClient } from "@/components/case-battle/case-battle-client"
import { getActiveCasesForFrontend } from "@/lib/cases"

export const dynamic = "force-dynamic"

export default async function CaseBattlePage() {
  const cases = await getActiveCasesForFrontend()

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gaming-texture text-sm text-muted-foreground">
          Загрузка...
        </div>
      }
    >
      <CaseBattleClient initialCases={cases} />
    </Suspense>
  )
}
