'use client'

import { useLocale } from '@/lib/i18n/LocaleContext'
import { getIstanbulDateString } from '@/lib/streak-utils'
import { useRef, useEffect, useState } from 'react'

interface ActivityMapProps {
  activityData: Record<string, number>
}

export function ActivityMap({ activityData }: ActivityMapProps) {
  const { t, locale } = useLocale()
  const containerRef = useRef<HTMLDivElement>(null)
  const [cellSize, setCellSize] = useState(10)

  const today = new Date()

  // === Build clean Mon→Sun 52-week grid ===
  const rawStart = new Date(today)
  rawStart.setDate(rawStart.getDate() - 364)
  const dow = rawStart.getDay()
  const backToMonday = dow === 0 ? 6 : dow - 1
  rawStart.setDate(rawStart.getDate() - backToMonday)

  const rawEnd = new Date(today)
  const todayDow = rawEnd.getDay()
  const forwardToSunday = todayDow === 0 ? 0 : 7 - todayDow
  rawEnd.setDate(rawEnd.getDate() + forwardToSunday)

  const dateList: Date[] = []
  const cur = new Date(rawStart)
  while (cur <= rawEnd) {
    dateList.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }

  const totalColumns = Math.ceil(dateList.length / 7)

  // === Responsive cell size ===
  useEffect(() => {
    const calc = () => {
      if (!containerRef.current) return
      // Available width = container - day-label col (28px) - padding (40px) - gap buffer (8px)
      const available = containerRef.current.clientWidth - 28 - 40 - 8
      // totalColumns cells + (totalColumns-1) gaps of GAP px
      // cellSize * totalColumns + GAP * (totalColumns - 1) = available
      // cellSize = (available + GAP) / totalColumns - GAP
      const GAP = 2
      const computed = (available + GAP) / totalColumns - GAP
      setCellSize(Math.max(7, Math.min(12, computed)))
    }
    calc()
    const ro = new ResizeObserver(calc)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [totalColumns])

  const GAP = 2

  // === Month labels ===
  // Her sütunun ilk günü (her zaman Pazartesi) hangi aydaysa, o ayı ilk görüşte etiketle.
  // Bu sayede Haziran 1 Pazar'a denk gelse bile Haz etiketi grid'in başına doğru gözükür.
  // Son 2 sütundaki etiketi göstermiyoruz — mevcut ay zaten en başta gösteriliyor.
  const monthLabels: { text: string; colIndex: number }[] = []
  const seenMonths = new Set<number>()

  for (let colIdx = 0; colIdx < totalColumns; colIdx++) {
    const firstDayOfCol = dateList[colIdx * 7]
    if (!firstDayOfCol) continue
    const key = firstDayOfCol.getFullYear() * 12 + firstDayOfCol.getMonth()
    if (!seenMonths.has(key)) {
      seenMonths.add(key)
      // Son 2 sütunda etiket gösterme (mevcut ay zaten en başta var)
      if (colIdx <= totalColumns - 3) {
        monthLabels.push({
          text: firstDayOfCol.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', { month: 'short' }),
          colIndex: colIdx,
        })
      }
    }
  }

  // === Day labels ===
  const dayLabels =
    locale === 'tr'
      ? ['Pzt', '', 'Çar', '', 'Cum', '', 'Paz']
      : ['Mon', '', 'Wed', '', 'Fri', '', 'Sun']

  const todayStr = getIstanbulDateString(today)
  const totalActivities = Object.values(activityData).reduce((s, n) => s + n, 0)

  const gridWidth = totalColumns * (cellSize + GAP) - GAP
  const gridHeight = 7 * (cellSize + GAP) - GAP

  return (
    <div
      ref={containerRef}
      className="bg-card border border-border rounded-2xl p-5 shadow-sm backdrop-blur-md relative overflow-visible select-none"
    >
      {/* Decorative glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
          {t('profile.activity_map')}
        </h3>
        <span className="text-[11px] font-bold text-muted-foreground bg-muted/30 border border-border/40 px-3 py-1 rounded-full">
          {t('profile.activity_count', { count: totalActivities })}
        </span>
      </div>

      {/* Grid layout */}
      <div className="flex gap-1.5 items-start w-full">
        {/* Day-of-week labels */}
        <div
          className="flex-shrink-0 grid text-[9px] font-semibold text-muted-foreground/70"
          style={{
            gridTemplateRows: `repeat(7, ${cellSize}px)`,
            gap: `${GAP}px`,
            paddingTop: '17px',
            width: '26px',
          }}
        >
          {dayLabels.map((label, i) => (
            <div key={i} className="flex items-center justify-end h-full leading-none pr-0.5">
              {label}
            </div>
          ))}
        </div>

        {/* Month + cells */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Month labels row — absolute positioned inside a relative container */}
          <div className="relative mb-1 flex-shrink-0" style={{ height: '15px' }}>
            {monthLabels.map((lbl, idx) => (
              <span
                key={idx}
                className="absolute text-[9px] font-bold text-muted-foreground/75 leading-none whitespace-nowrap"
                style={{
                  left: `${lbl.colIndex * (cellSize + GAP)}px`,
                  top: '2px',
                }}
              >
                {lbl.text}
              </span>
            ))}
          </div>

          {/* Contribution cells */}
          <div
            className="grid flex-shrink-0"
            style={{
              gridTemplateRows: `repeat(7, ${cellSize}px)`,
              gridAutoFlow: 'column',
              gridAutoColumns: `${cellSize}px`,
              gap: `${GAP}px`,
              width: `${gridWidth}px`,
              height: `${gridHeight}px`,
            }}
          >
            {dateList.map((date, idx) => {
              const dateStr = getIstanbulDateString(date)
              const isFuture = dateStr > todayStr
              const count = activityData[dateStr] || 0

              if (isFuture) {
                return (
                  <div
                    key={idx}
                    style={{ width: cellSize, height: cellSize }}
                    className="rounded-[1.5px] bg-transparent pointer-events-none"
                  />
                )
              }

              let cellClass = 'bg-muted/25 border border-border/20'
              if (count >= 10) {
                cellClass = 'bg-teal-400 border border-teal-300/30 shadow-[0_0_8px_rgba(45,212,191,0.55)] hover:scale-125'
              } else if (count >= 6) {
                cellClass = 'bg-teal-500 border border-teal-400/20 hover:scale-125 hover:shadow-[0_0_5px_rgba(20,184,166,0.35)]'
              } else if (count >= 3) {
                cellClass = 'bg-teal-600/75 border border-teal-500/10 hover:scale-125'
              } else if (count >= 1) {
                cellClass = 'bg-teal-700/45 border border-teal-600/10 hover:scale-125'
              }

              const formattedDate = date.toLocaleDateString(
                locale === 'tr' ? 'tr-TR' : 'en-US',
                { day: 'numeric', month: 'long', year: 'numeric' },
              )

              const tooltipText =
                count > 0
                  ? t('profile.activity_tooltip', { date: formattedDate, count })
                  : t('profile.activity_tooltip_zero', { date: formattedDate })

              return (
                <div key={idx} className="group relative">
                  <div
                    style={{ width: cellSize, height: cellSize }}
                    className={`rounded-[1.5px] transition-all duration-150 cursor-pointer ${cellClass}`}
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
                    <div className="bg-card/95 border border-border/80 px-2.5 py-1.5 text-[9.5px] font-black text-foreground rounded-lg shadow-xl backdrop-blur-md whitespace-nowrap">
                      {tooltipText}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 text-[10px] font-bold text-muted-foreground/80 mt-3 pt-3 border-t border-border/40">
        <span>{t('profile.activity_less')}</span>
        <div className="w-[10px] h-[10px] rounded-[1.5px] bg-muted/25 border border-border/20" />
        <div className="w-[10px] h-[10px] rounded-[1.5px] bg-teal-700/45 border border-teal-600/10" />
        <div className="w-[10px] h-[10px] rounded-[1.5px] bg-teal-600/75 border border-teal-500/10" />
        <div className="w-[10px] h-[10px] rounded-[1.5px] bg-teal-500 border border-teal-400/20" />
        <div className="w-[10px] h-[10px] rounded-[1.5px] bg-teal-400 border border-teal-300/30 shadow-[0_0_4px_rgba(45,212,191,0.4)]" />
        <span>{t('profile.activity_more')}</span>
      </div>
    </div>
  )
}
