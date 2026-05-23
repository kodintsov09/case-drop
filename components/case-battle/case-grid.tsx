"use client"

import { CaseItem, formatPrice } from "@/lib/case-battle"
import { RemoteImage } from "./remote-image"
import { CasePlaceholder } from "./svg-placeholders"

interface CaseGridProps {
  cases: CaseItem[]
  onCaseClick: (caseItem: CaseItem) => void
}

export function CaseGrid({ cases, onCaseClick }: CaseGridProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Section header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Популярные кейсы</h2>
          <p className="text-xs text-muted-foreground">Выбери кейс и испытай удачу</p>
        </div>
        <div className="flex gap-2">
          {["Все", "Новые", "Популярные", "Дешёвые"].map((filter, i) => (
            <button
              key={filter}
              className={`rounded px-3 py-1 text-xs font-medium transition-all ${
                i === 0
                  ? "bg-gradient-to-r from-[#ff9900] to-[#ff5500] text-black"
                  : "bg-[#1a1d24] text-muted-foreground hover:text-white"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {cases.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/40 bg-[#12151a]/50 px-6 py-16 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Кейсов пока нет
          </p>
          <p className="mt-1 text-xs text-muted-foreground/80">
            Добавьте кейсы через админ-панель
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {cases.map((caseItem) => (
          <button
            key={caseItem.id}
            onClick={() => onCaseClick(caseItem)}
            className="group relative overflow-hidden rounded-lg border border-border/30 bg-[#12151a] p-3 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[#ff9900]/30 hover:shadow-[0_0_30px_rgba(255,153,0,0.15)]"
          >
            {/* Glow effect */}
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div 
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(ellipse at 50% 30%, ${caseItem.color}20 0%, transparent 60%)`,
                }}
              />
            </div>

            {/* Case image */}
            <div className="relative mb-2 flex aspect-square items-center justify-center">
              <div 
                className="absolute inset-0 transition-all duration-300 group-hover:scale-110"
                style={{
                  background: `radial-gradient(ellipse at center, ${caseItem.color}25 0%, transparent 60%)`,
                }}
              />
              <RemoteImage
                src={caseItem.image}
                alt={caseItem.name}
                className="relative z-10 h-full w-full object-contain transition-transform duration-300 group-hover:scale-110"
                fallback={
                  <CasePlaceholder
                    className="relative z-10 h-full w-full transition-transform duration-300 group-hover:scale-110"
                    color={caseItem.color}
                  />
                }
              />
            </div>

            {/* Info */}
            <div className="relative z-10">
              <h3 className="truncate text-sm font-bold">{caseItem.name}</h3>
              <div className="mt-1 flex items-center justify-between">
                <span 
                  className="text-sm font-black"
                  style={{ color: '#ffd700' }}
                >
                  {formatPrice(caseItem.price)} ₽
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {caseItem.skins.length} скинов
                </span>
              </div>
            </div>

            {/* Hover open button */}
            <div className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              <div 
                className="rounded py-1.5 text-center text-xs font-bold text-black"
                style={{
                  background: 'linear-gradient(135deg, #ff9900 0%, #ff5500 100%)',
                }}
              >
                ОТКРЫТЬ
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
