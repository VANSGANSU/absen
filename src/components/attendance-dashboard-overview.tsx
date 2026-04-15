"use client"

import * as React from "react"
import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  Crosshair,
  ScanSearch,
  ShieldAlert,
  Target,
  TrendingUp,
  UsersRound,
  Waves,
} from "lucide-react"
import {
  sharedDateOptions,
  useSharedDashboardRange,
  type SharedDateOption,
  type SharedDashboardRange,
} from "@/lib/shared-dashboard-range"

type AttendanceDashboardOverviewProps = {
  initialNow: string
}

function formatDate(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", {
    ...options,
    timeZone: "Asia/Jakarta",
  }).format(date)
}

function formatShortRange(start: Date, end: Date) {
  const startText = formatDate(start, { month: "short", day: "2-digit" })
  const endText = formatDate(end, { month: "short", day: "2-digit", year: "numeric" })

  return `${startText} - ${endText}`
}

function getStartOfWeek(date: Date) {
  const next = new Date(date)
  const dayIndex = (next.getDay() + 6) % 7
  next.setHours(0, 0, 0, 0)
  next.setDate(next.getDate() - dayIndex)
  return next
}

function getEndOfWeek(date: Date) {
  const next = getStartOfWeek(date)
  next.setDate(next.getDate() + 6)
  return next
}

function getStartOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function getEndOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function getStartOfYear(year: number) {
  return new Date(year, 0, 1)
}

function getEndOfYear(year: number) {
  return new Date(year, 11, 31)
}

function getRangeMeta(selectedRange: SharedDashboardRange, currentTime: Date) {
  const today = new Date(currentTime)
  const yesterday = new Date(currentTime)
  yesterday.setDate(yesterday.getDate() - 1)
  const currentYear = currentTime.getFullYear()

  switch (selectedRange) {
    case "Today":
      return {
        pickerLabel: formatDate(today, { month: "short", day: "2-digit", year: "numeric" }),
        badgeLabel: "Today",
        recordsLabel: `0 records from ${formatDate(today, {
          month: "short",
          day: "2-digit",
          year: "numeric",
        })}`,
      }
    case "Yesterday":
      return {
        pickerLabel: formatDate(yesterday, { month: "short", day: "2-digit", year: "numeric" }),
        badgeLabel: "Yesterday",
        recordsLabel: `0 records from ${formatDate(yesterday, {
          month: "short",
          day: "2-digit",
          year: "numeric",
        })}`,
      }
    case "This week": {
      const start = getStartOfWeek(currentTime)
      const end = getEndOfWeek(currentTime)
      return {
        pickerLabel: formatShortRange(start, end),
        badgeLabel: "This Week",
        recordsLabel: `0 records from ${formatDate(start, {
          month: "short",
          day: "2-digit",
        })} to ${formatDate(end, { month: "short", day: "2-digit", year: "numeric" })}`,
      }
    }
    case "This month": {
      const start = getStartOfMonth(currentTime)
      const end = getEndOfMonth(currentTime)
      return {
        pickerLabel: formatShortRange(start, end),
        badgeLabel: "This Month",
        recordsLabel: `0 records from ${formatDate(start, {
          month: "short",
          day: "2-digit",
        })} to ${formatDate(end, { month: "short", day: "2-digit", year: "numeric" })}`,
      }
    }
    case "This year": {
      const start = getStartOfYear(currentYear)
      const end = getEndOfYear(currentYear)
      return {
        pickerLabel: formatShortRange(start, end),
        badgeLabel: "This Year",
        recordsLabel: `0 records from ${formatDate(start, {
          month: "short",
          day: "2-digit",
        })} to ${formatDate(end, { month: "short", day: "2-digit", year: "numeric" })}`,
      }
    }
    case "Last year": {
      const start = getStartOfYear(currentYear - 1)
      const end = getEndOfYear(currentYear - 1)
      return {
        pickerLabel: formatShortRange(start, end),
        badgeLabel: "Last Year",
        recordsLabel: `0 records from ${formatDate(start, {
          month: "short",
          day: "2-digit",
        })} to ${formatDate(end, { month: "short", day: "2-digit", year: "numeric" })}`,
      }
    }
    case "Last 7 days": {
      const start = new Date(currentTime)
      start.setDate(start.getDate() - 6)
      return {
        pickerLabel: formatShortRange(start, currentTime),
        badgeLabel: "Last 7 Days",
        recordsLabel: `0 records from ${formatDate(start, {
          month: "short",
          day: "2-digit",
        })} to ${formatDate(currentTime, { month: "short", day: "2-digit", year: "numeric" })}`,
      }
    }
    case "Last 30 days": {
      const start = new Date(currentTime)
      start.setDate(start.getDate() - 29)
      return {
        pickerLabel: formatShortRange(start, currentTime),
        badgeLabel: "Last 30 Days",
        recordsLabel: `0 records from ${formatDate(start, {
          month: "short",
          day: "2-digit",
        })} to ${formatDate(currentTime, { month: "short", day: "2-digit", year: "numeric" })}`,
      }
    }
  }
}

const organizationCards = [
  {
    label: "Total Members",
    value: "0",
    note: "Active members in organization",
    icon: UsersRound,
    iconTone: "text-slate-400",
  },
  {
    label: "Groups",
    value: "0",
    note: "Total organizational units",
    icon: BriefcaseBusiness,
    iconTone: "text-fuchsia-300",
  },
  {
    label: "Avg Group Size",
    value: "0",
    note: "Members per Groups",
    icon: Target,
    iconTone: "text-emerald-400",
  },
]

const kpiCards = [
  {
    label: "Attendance Rate",
    value: "0.0%",
    note: "No data available",
    icon: CheckCircle2,
    border: "border-l-[5px] border-l-emerald-500",
    tint: "from-emerald-50 to-white",
    bar: "bg-emerald-200",
    valueTone: "text-slate-700",
  },
  {
    label: "Punctuality Rate",
    value: "0.0%",
    note: "No data available",
    icon: ScanSearch,
    border: "border-l-[5px] border-l-blue-500",
    tint: "from-blue-50 to-white",
    bar: "bg-blue-200",
    valueTone: "text-slate-700",
  },
  {
    label: "Avg Work Hours",
    value: "0.0h",
    note: "No data available",
    icon: Clock3,
    border: "border-l-[5px] border-l-orange-500",
    tint: "from-orange-50 to-white",
    bar: "bg-orange-200",
    valueTone: "text-slate-500",
  },
  {
    label: "Absenteeism Rate",
    value: "0.0%",
    note: "No data available",
    icon: ShieldAlert,
    border: "border-l-[5px] border-l-red-500",
    tint: "from-red-50 to-white",
    bar: "bg-red-200",
    valueTone: "text-red-600",
  },
]

export function AttendanceDashboardOverview({
  initialNow,
}: AttendanceDashboardOverviewProps) {
  const { selectedRange, setSelectedRange } = useSharedDashboardRange("This week")
  const [currentTime, setCurrentTime] = React.useState(() => new Date(initialNow))
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    window.addEventListener("mousedown", handlePointerDown)
    return () => window.removeEventListener("mousedown", handlePointerDown)
  }, [])

  React.useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  const groupedOptions = sharedDateOptions.reduce<Record<string, SharedDateOption[]>>(
    (acc, item) => {
      if (!acc[item.group]) {
        acc[item.group] = []
      }
      acc[item.group].push(item)
      return acc
    },
    {}
  )

  const rangeMeta = React.useMemo(
    () => getRangeMeta(selectedRange, currentTime),
    [selectedRange, currentTime]
  )

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-[3.25rem]">
              Dashboard
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-[1.05rem] text-slate-500">
              <span className="rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-950">
                {rangeMeta.badgeLabel}
              </span>
              <span>{rangeMeta.recordsLabel}</span>
            </div>
          </div>

          <div ref={dropdownRef} className="relative z-30 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsMenuOpen((current) => !current)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 shadow-sm sm:min-w-72"
            >
              <div className="flex items-center gap-3">
                <CalendarDays className="size-5" />
                <span className="text-base font-medium">{rangeMeta.pickerLabel}</span>
              </div>
              <ChevronDown className="size-4" />
            </button>

            {isMenuOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:w-80">
                {Object.entries(groupedOptions).map(([group, items], index) => (
                  <div key={group} className={index ? "border-t border-slate-200" : ""}>
                    <div className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-500">
                      <CalendarDays className="size-4" />
                      {group}
                    </div>
                    <div className="pb-2">
                      {items.map((item) => {
                        const isSelected = selectedRange === item.label

                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => {
                              setSelectedRange(item.label)
                              setIsMenuOpen(false)
                            }}
                            className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-base transition ${
                              isSelected
                                ? "bg-slate-100 text-slate-950"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <span>{item.label}</span>
                            {isSelected ? <CheckCircle2 className="size-4" /> : null}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-center gap-3 text-slate-950">
          <ClipboardList className="size-6" />
          <h2 className="text-[1.6rem] font-semibold">Organization Overview</h2>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {organizationCards.map((card) => (
            <article
              key={card.label}
              className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[1.05rem] text-slate-500">{card.label}</p>
                  <p className="mt-10 text-[2.7rem] font-semibold tracking-tight text-slate-950">
                    {card.value}
                  </p>
                  <p className="mt-2 text-[1.05rem] text-slate-500">{card.note}</p>
                </div>
                <div className={`flex h-14 w-14 items-center justify-center ${card.iconTone}`}>
                  <card.icon className="size-9" strokeWidth={1.8} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-slate-950">
            <Crosshair className="size-6" />
            <h2 className="text-[1.6rem] font-semibold">Key Performance Indicators</h2>
          </div>
          <span className="rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-950">
            {rangeMeta.badgeLabel}
          </span>
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          {kpiCards.map((card) => (
            <article
              key={card.label}
              className={`rounded-[1.6rem] border border-slate-200 bg-gradient-to-br ${card.tint} p-6 shadow-sm ${card.border}`}
            >
              <div className="flex items-center gap-3 text-slate-950">
                <card.icon className="size-5" strokeWidth={1.8} />
                <p className="text-[1.05rem] font-medium">{card.label}</p>
              </div>
              <p className={`mt-14 text-[2.7rem] font-semibold tracking-tight ${card.valueTone}`}>
                {card.value}
              </p>
              <div className={`mt-4 h-2 rounded-full ${card.bar}`} />
              <p className="mt-3 text-[1.05rem] text-slate-500">{card.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-center gap-3 text-slate-950">
          <Waves className="size-6" />
          <h2 className="text-[1.6rem] font-semibold">Attendance Trends</h2>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <article className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-[1.1rem] font-semibold text-slate-950">Daily Attendance Trend</h3>
            <p className="mt-2 text-[1.05rem] text-slate-500">Last 14 days attendance pattern</p>

            <div className="grid min-h-[26rem] place-items-center">
              <div className="text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                  <ClipboardList className="size-10" />
                </div>
                <p className="mt-8 text-[2rem] font-semibold text-slate-950">No trend data</p>
                <p className="mt-3 text-[1.2rem] text-slate-400">
                  Not enough data points to show trend
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-[1.1rem] font-semibold text-slate-950">Status Distribution</h3>
            <p className="mt-2 text-[1.05rem] text-slate-500">
              Breakdown by attendance status
            </p>

            <div className="grid min-h-[26rem] items-end">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Present", color: "bg-emerald-500" },
                  { label: "Late", color: "bg-amber-500" },
                  { label: "Absent", color: "bg-red-500" },
                  { label: "Leave", color: "bg-blue-500" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 text-[1.05rem] text-slate-600">
                    <span className={`h-4 w-4 rounded-full ${item.color}`} />
                    <span>{item.label}:</span>
                    <span className="font-semibold text-slate-950">0</span>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-center gap-3 text-slate-950">
          <BriefcaseBusiness className="size-6" />
          <h2 className="text-[1.6rem] font-semibold">Groups Performance</h2>
        </div>

        <article className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-[1.1rem] font-semibold text-slate-950">
            Top 0 Groups by Attendance Rate
          </h3>
          <p className="mt-2 text-[1.05rem] text-slate-500">
            Ranked by percentage of attendance
          </p>

          <div className="grid min-h-[24rem] place-items-center">
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                <BriefcaseBusiness className="size-10" />
              </div>
              <p className="mt-8 text-[2rem] font-semibold text-slate-950">No groups data</p>
              <p className="mt-3 text-[1.2rem] text-slate-400">
                No performance data available for groups
              </p>
            </div>
          </div>
        </article>
      </section>
    </div>
  )
}
