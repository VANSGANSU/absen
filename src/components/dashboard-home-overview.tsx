"use client"

import * as React from "react"
import {
  Activity,
  BellRing,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  RefreshCw,
  TrendingUp,
  UsersRound,
  Waves,
} from "lucide-react"
import {
  sharedDateOptions,
  useSharedDashboardRange,
  type SharedDateOption,
} from "@/lib/shared-dashboard-range"

type DashboardHomeOverviewProps = {
  user: {
    name: string
    email: string
  }
  initialNow: string
}

type ChartPoint = {
  label: string
  value: number
}

type TimeSeriesPoint = {
  label: string
  tooltipLabel: string
  present: number
  late: number
}

type DistributionItem = {
  label: string
  value: number
  color: string
}

type HoveredChartState = {
  index: number
  x: number
  y: number
}

type StatCardData = {
  label: string
  value: string
  change: string
  note: string
  icon: typeof Clock3
}

type DashboardRangeView = {
  pickerLabel: string
  statCards: StatCardData[]
  chartTitle: string
  chartSubtitle: string
  chartBadge: string
  chartMode: "single" | "multi"
  chartPoints?: ChartPoint[]
  timeSeriesPoints?: TimeSeriesPoint[]
  distribution: DistributionItem[]
}

const chartViewBoxWidth = 920
const chartViewBoxHeight = 280
const chartPaddingLeft = 52
const chartPaddingRight = 24
const chartPaddingTop = 22
const chartPaddingBottom = 42

function getRevealStyle(delay: number) {
  return {
    animationDelay: `${delay}ms`,
  }
}

function formatDate(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", {
    ...options,
    timeZone: "Asia/Jakarta",
  }).format(date)
}

function formatRangeLabel(start: Date, end: Date) {
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

function getChartX(index: number, pointCount: number) {
  const width = chartViewBoxWidth - chartPaddingLeft - chartPaddingRight

  if (pointCount <= 1) {
    return chartPaddingLeft
  }

  return chartPaddingLeft + (index / (pointCount - 1)) * width
}

function getChartY(value: number, maxValue: number) {
  const height = chartViewBoxHeight - chartPaddingTop - chartPaddingBottom
  const safeMax = Math.max(maxValue, 1)
  return chartPaddingTop + height - (value / safeMax) * height
}

function buildLinePath(
  points: ChartPoint[],
  maxValue: number
) {
  return points
    .map((point, index) => {
      const prefix = index === 0 ? "M" : "L"
      return `${prefix} ${getChartX(index, points.length)} ${getChartY(point.value, maxValue)}`
    })
    .join(" ")
}

function buildMultiLinePath(
  points: TimeSeriesPoint[],
  key: "present" | "late",
  maxValue: number
) {
  return points
    .map((point, index) => {
      const prefix = index === 0 ? "M" : "L"
      return `${prefix} ${getChartX(index, points.length)} ${getChartY(point[key], maxValue)}`
    })
    .join(" ")
}

function buildAreaPath(points: ChartPoint[], maxValue: number) {
  if (!points.length) {
    return ""
  }

  const linePath = buildLinePath(points, maxValue)
  const lastX = getChartX(points.length - 1, points.length)
  const baseY = chartViewBoxHeight - chartPaddingBottom

  return `${linePath} L ${lastX} ${baseY} L ${chartPaddingLeft} ${baseY} Z`
}

function getIndexFromRelativePosition(relativeX: number, width: number, pointCount: number) {
  if (pointCount <= 1) {
    return 0
  }

  return Math.round(Math.min(1, Math.max(0, relativeX / width)) * (pointCount - 1))
}

function getDonutSegmentStyle(items: DistributionItem[], index: number) {
  const total = items.reduce((sum, item) => sum + item.value, 0)

  if (!total) {
    return { dashArray: "0 100", dashOffset: 0 }
  }

  const previousValue = items.slice(0, index).reduce((sum, item) => sum + item.value, 0)
  const currentValue = items[index].value
  const segmentLength = (currentValue / total) * 100
  const previousLength = (previousValue / total) * 100

  return {
    dashArray: `${segmentLength} ${100 - segmentLength}`,
    dashOffset: 25 - previousLength,
  }
}

function getMultiSeriesStatus(point: TimeSeriesPoint) {
  if (point.present === 0 && point.late === 0) {
    return "No attendance"
  }

  if (point.late === 0) {
    return "On time"
  }

  if (point.late >= point.present) {
    return "Late spike"
  }

  return "Mixed attendance"
}

function createStatCards(data: {
  totalWorkHours: string
  activeMembers: string
  onTimeRate: string
  avgHoursPerMember: string
}) {
  return [
    {
      label: "Total Work Hours",
      value: data.totalWorkHours,
      change: "+12%",
      note: "from last period",
      icon: Clock3,
    },
    {
      label: "Active Members",
      value: data.activeMembers,
      change: "+5",
      note: "new this week",
      icon: UsersRound,
    },
    {
      label: "On-Time Rate",
      value: data.onTimeRate,
      change: "+8%",
      note: "improvement",
      icon: BellRing,
    },
    {
      label: "Avg Hours/Member",
      value: data.avgHoursPerMember,
      change: "0%",
      note: "no change",
      icon: TrendingUp,
    },
  ] satisfies StatCardData[]
}

function getDashboardRangeView(selectedRange: string, currentTime: Date): DashboardRangeView {
  const currentYear = currentTime.getFullYear()
  const weekStart = getStartOfWeek(currentTime)
  const weekEnd = getEndOfWeek(currentTime)
  const monthStart = getStartOfMonth(currentTime)
  const monthEnd = getEndOfMonth(currentTime)
  const yearStart = getStartOfYear(currentYear)
  const yearEnd = getEndOfYear(currentYear)
  const lastYearStart = getStartOfYear(currentYear - 1)
  const lastYearEnd = getEndOfYear(currentYear - 1)

  switch (selectedRange) {
    case "This week":
      return {
        pickerLabel: formatRangeLabel(weekStart, weekEnd),
        statCards: createStatCards({
          totalWorkHours: "0.0h",
          activeMembers: "0",
          onTimeRate: "0%",
          avgHoursPerMember: "0.0h",
        }),
        chartTitle: "Attendance Trend",
        chartSubtitle: "Attendance patterns for custom range",
        chartBadge: "Custom Range",
        chartMode: "single",
        chartPoints: [
          { label: "Mon", value: 0 },
          { label: "Tue", value: 0 },
          { label: "Wed", value: 0 },
          { label: "Thu", value: 0 },
          { label: "Fri", value: 0 },
          { label: "Sat", value: 0 },
          { label: "Sun", value: 0 },
        ],
        distribution: [],
      }
    case "This month":
      return {
        pickerLabel: formatRangeLabel(monthStart, monthEnd),
        statCards: createStatCards({
          totalWorkHours: "8.0h",
          activeMembers: "1",
          onTimeRate: "100%",
          avgHoursPerMember: "8.0h",
        }),
        chartTitle: "Attendance Trend",
        chartSubtitle: "Attendance patterns for custom range",
        chartBadge: "Custom Range",
        chartMode: "single",
        chartPoints: [
          { label: "Mon", value: 0 },
          { label: "Tue", value: 0 },
          { label: "Wed", value: 1 },
          { label: "Thu", value: 0 },
          { label: "Fri", value: 0 },
          { label: "Sat", value: 0 },
          { label: "Sun", value: 0 },
        ],
        distribution: [{ label: "Present", value: 1, color: "#10b981" }],
      }
    case "This year":
      return {
        pickerLabel: formatRangeLabel(yearStart, yearEnd),
        statCards: createStatCards({
          totalWorkHours: "75.0h",
          activeMembers: "4",
          onTimeRate: "100%",
          avgHoursPerMember: "7.5h",
        }),
        chartTitle: "Monthly Attendance",
        chartSubtitle: "Monthly attendance patterns for this year",
        chartBadge: "This Year",
        chartMode: "single",
        chartPoints: [
          { label: "Jan", value: 0 },
          { label: "Feb", value: 4 },
          { label: "Mar", value: 2 },
          { label: "Apr", value: 1 },
          { label: "May", value: 0 },
          { label: "Jun", value: 0 },
          { label: "Jul", value: 0 },
          { label: "Aug", value: 0 },
          { label: "Sep", value: 0 },
          { label: "Oct", value: 0 },
          { label: "Nov", value: 0 },
          { label: "Dec", value: 0 },
        ],
        distribution: [
          { label: "Present", value: 7, color: "#10b981" },
          { label: "Absent", value: 2, color: "#ef4444" },
        ],
      }
    case "Last year":
      return {
        pickerLabel: formatRangeLabel(lastYearStart, lastYearEnd),
        statCards: createStatCards({
          totalWorkHours: "0.0h",
          activeMembers: "0",
          onTimeRate: "0%",
          avgHoursPerMember: "0.0h",
        }),
        chartTitle: "Monthly Attendance",
        chartSubtitle: "Monthly attendance patterns for last year",
        chartBadge: "Last Year",
        chartMode: "single",
        chartPoints: [
          { label: "Jan", value: 0 },
          { label: "Feb", value: 0 },
          { label: "Mar", value: 0 },
          { label: "Apr", value: 0 },
          { label: "May", value: 0 },
          { label: "Jun", value: 0 },
          { label: "Jul", value: 0 },
          { label: "Aug", value: 0 },
          { label: "Sep", value: 0 },
          { label: "Oct", value: 0 },
          { label: "Nov", value: 0 },
          { label: "Dec", value: 0 },
        ],
        distribution: [],
      }
    case "Today":
      return {
        pickerLabel: formatDate(currentTime, { month: "short", day: "2-digit", year: "numeric" }),
        statCards: createStatCards({
          totalWorkHours: "6.0h",
          activeMembers: "1",
          onTimeRate: "100%",
          avgHoursPerMember: "6.0h",
        }),
        chartTitle: "Hourly Attendance",
        chartSubtitle: "Check-in patterns throughout the day",
        chartBadge: "Today",
        chartMode: "multi",
        timeSeriesPoints: [
          { label: "0", tooltipLabel: "00:00", present: 0, late: 0 },
          { label: "1", tooltipLabel: "01:00", present: 0, late: 0 },
          { label: "2", tooltipLabel: "02:00", present: 0, late: 0 },
          { label: "3", tooltipLabel: "03:00", present: 0, late: 0 },
          { label: "4", tooltipLabel: "04:00", present: 0, late: 0 },
          { label: "5", tooltipLabel: "05:00", present: 0, late: 0 },
          { label: "6", tooltipLabel: "06:00", present: 1, late: 0 },
          { label: "7", tooltipLabel: "07:00", present: 4, late: 1 },
          { label: "8", tooltipLabel: "08:00", present: 10, late: 2 },
          { label: "9", tooltipLabel: "09:00", present: 18, late: 4 },
          { label: "10", tooltipLabel: "10:00", present: 22, late: 5 },
          { label: "11", tooltipLabel: "11:00", present: 21, late: 4 },
          { label: "12", tooltipLabel: "12:00", present: 16, late: 3 },
          { label: "13", tooltipLabel: "13:00", present: 14, late: 2 },
          { label: "14", tooltipLabel: "14:00", present: 13, late: 2 },
          { label: "15", tooltipLabel: "15:00", present: 12, late: 2 },
          { label: "16", tooltipLabel: "16:00", present: 10, late: 1 },
          { label: "17", tooltipLabel: "17:00", present: 8, late: 1 },
          { label: "18", tooltipLabel: "18:00", present: 5, late: 1 },
          { label: "19", tooltipLabel: "19:00", present: 3, late: 0 },
          { label: "20", tooltipLabel: "20:00", present: 2, late: 0 },
          { label: "21", tooltipLabel: "21:00", present: 1, late: 0 },
          { label: "22", tooltipLabel: "22:00", present: 0, late: 0 },
          { label: "23", tooltipLabel: "23:00", present: 0, late: 0 },
        ],
        distribution: [{ label: "Present", value: 1, color: "#10b981" }],
      }
    case "Yesterday":
      return {
        pickerLabel: formatDate(
          new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate() - 1),
          { month: "short", day: "2-digit", year: "numeric" }
        ),
        statCards: createStatCards({
          totalWorkHours: "7.5h",
          activeMembers: "1",
          onTimeRate: "100%",
          avgHoursPerMember: "7.5h",
        }),
        chartTitle: "Daily Attendance",
        chartSubtitle: "Attendance patterns over the last week",
        chartBadge: "Yesterday",
        chartMode: "multi",
        timeSeriesPoints: [
          { label: "Mon", tooltipLabel: "Monday", present: 0, late: 0 },
          { label: "Tue", tooltipLabel: "Tuesday", present: 0, late: 0 },
          { label: "Wed", tooltipLabel: "Wednesday", present: 1, late: 0 },
          { label: "Thu", tooltipLabel: "Thursday", present: 0, late: 0 },
          { label: "Fri", tooltipLabel: "Friday", present: 0, late: 0 },
          { label: "Sat", tooltipLabel: "Saturday", present: 0, late: 0 },
          { label: "Sun", tooltipLabel: "Sunday", present: 0, late: 0 },
        ],
        distribution: [{ label: "Present", value: 1, color: "#10b981" }],
      }
    default:
      return {
        pickerLabel: formatDate(currentTime, { month: "short", day: "2-digit", year: "numeric" }),
        statCards: createStatCards({
          totalWorkHours: "6.0h",
          activeMembers: "1",
          onTimeRate: "100%",
          avgHoursPerMember: "6.0h",
        }),
        chartTitle: "Attendance Trend",
        chartSubtitle: `Attendance patterns for ${selectedRange.toLowerCase()}`,
        chartBadge: selectedRange,
        chartMode: "single",
        chartPoints: [
          { label: "00", value: 0 },
          { label: "04", value: 0 },
          { label: "08", value: 1 },
          { label: "12", value: 1 },
          { label: "16", value: 0 },
          { label: "20", value: 0 },
          { label: "23", value: 0 },
        ],
        distribution: [{ label: "Present", value: 1, color: "#10b981" }],
      }
  }
}

export function DashboardHomeOverview({
  user,
  initialNow,
}: DashboardHomeOverviewProps) {
  const [currentTime, setCurrentTime] = React.useState(() => new Date(initialNow))
  const { selectedRange, setSelectedRange } = useSharedDashboardRange("This week")
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)
  const [lastUpdated, setLastUpdated] = React.useState(() => new Date(initialNow))
  const [selectedPointIndex, setSelectedPointIndex] = React.useState(0)
  const [hoveredChart, setHoveredChart] = React.useState<HoveredChartState | null>(null)
  const [isReadyToReveal, setIsReadyToReveal] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement | null>(null)
  const chartRef = React.useRef<HTMLDivElement | null>(null)

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

  React.useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsReadyToReveal(true)
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [])

  const currentDateKey = formatDate(currentTime, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })

  const activeView = React.useMemo(
    () => getDashboardRangeView(selectedRange, currentTime),
    [selectedRange, currentDateKey]
  )
  const singleChartPoints: ChartPoint[] = activeView.chartPoints ?? []
  const multiSeriesPoints: TimeSeriesPoint[] = activeView.timeSeriesPoints ?? []
  const activeChartLength =
    activeView.chartMode === "multi" ? multiSeriesPoints.length : singleChartPoints.length

  React.useEffect(() => {
    const preferredIndex = activeView.chartMode === "multi"
      ? multiSeriesPoints.findIndex((point) => Math.max(point.present, point.late) > 0)
      : singleChartPoints.findIndex((point) => point.value > 0)
    setSelectedPointIndex(preferredIndex >= 0 ? preferredIndex : 0)
    setHoveredChart(null)
  }, [selectedRange, activeView.chartMode, activeChartLength])

  const headingDate = formatDate(currentTime, {
    weekday: "long",
    month: "long",
    day: "2-digit",
    year: "numeric",
  })

  const headingTime = formatDate(currentTime, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })

  const updatedLabel = formatDate(lastUpdated, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })

  const groupedOptions = sharedDateOptions.reduce<Record<string, SharedDateOption[]>>((acc, item) => {
    if (!acc[item.group]) {
      acc[item.group] = []
    }
    acc[item.group].push(item)
    return acc
  }, {})

  const maxChartValue = activeView.chartMode === "multi"
    ? Math.max(...multiSeriesPoints.map((point) => Math.max(point.present, point.late)), 1)
    : Math.max(...singleChartPoints.map((point) => point.value), 1)
  const activeIndex = hoveredChart?.index ?? selectedPointIndex
  const activeSinglePoint = singleChartPoints[activeIndex] ?? singleChartPoints[0]
  const activeMultiPoint = multiSeriesPoints[activeIndex] ?? multiSeriesPoints[0]
  const linePath = activeView.chartMode === "multi"
    ? buildMultiLinePath(multiSeriesPoints, "present", maxChartValue)
    : buildLinePath(singleChartPoints, maxChartValue)
  const secondaryLinePath = activeView.chartMode === "multi"
    ? buildMultiLinePath(multiSeriesPoints, "late", maxChartValue)
    : ""
  const areaPath = activeView.chartMode === "multi" ? "" : buildAreaPath(singleChartPoints, maxChartValue)
  const activePointX = getChartX(activeIndex, activeChartLength)
  const activePointY = activeView.chartMode === "multi"
    ? getChartY(activeMultiPoint.present, maxChartValue)
    : getChartY(activeSinglePoint.value, maxChartValue)
  const activeLateY = activeView.chartMode === "multi"
    ? getChartY(activeMultiPoint.late, maxChartValue)
    : activePointY
  const tooltipLeft = hoveredChart ? hoveredChart.x : activePointX
  const tooltipTop = hoveredChart ? hoveredChart.y : 12
  const distributionTotal = activeView.distribution.reduce((sum, item) => sum + item.value, 0)

  const updateHoveredChart = (clientX: number, clientY: number) => {
    if (!chartRef.current) {
      return
    }

    const bounds = chartRef.current.getBoundingClientRect()
    const relativeX = clientX - bounds.left
    const relativeY = clientY - bounds.top
    const nextIndex = getIndexFromRelativePosition(
      relativeX,
      bounds.width,
      activeChartLength
    )
    const nextX = Math.min(Math.max(relativeX, 116), bounds.width - 116)
    const nextY = Math.min(Math.max(relativeY - 78, 12), bounds.height - 126)

    setHoveredChart({ index: nextIndex, x: nextX, y: nextY })
  }

  const chartEmpty = activeView.chartMode === "multi"
    ? multiSeriesPoints.every((point) => point.present === 0 && point.late === 0)
    : singleChartPoints.every((point) => point.value === 0)

  return (
    <div className="space-y-6">
      <section
        className={`home-rise-in relative z-30 flex flex-col gap-5 rounded-[1.75rem] border border-slate-200 bg-white p-4 sm:p-6 lg:flex-row lg:items-end lg:justify-between ${
          isReadyToReveal ? "is-visible" : ""
        }`}
        style={getRevealStyle(0)}
      >
        <div>
          <p className="text-sm font-medium text-slate-500">Home</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950 sm:text-[2.35rem]">
            Dashboard - MAGANG UBIG
          </h1>
          <p className="mt-2 text-base text-slate-500">
            {headingDate} • {headingTime}
          </p>
        </div>

        <div ref={dropdownRef} className="relative z-40 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsMenuOpen((current) => !current)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 shadow-sm sm:min-w-72"
          >
            <div className="flex items-center gap-3">
              <CalendarDays className="size-5" />
              <span className="text-base font-medium">{activeView.pickerLabel}</span>
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
                            isSelected ? "bg-slate-100 text-slate-950" : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span>{item.label}</span>
                          {isSelected ? <Check className="size-4" /> : null}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {activeView.statCards.map((card, index) => (
          <article
            key={`${selectedRange}-${card.label}`}
            className={`home-rise-in rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm ${
              isReadyToReveal ? "is-visible" : ""
            }`}
            style={getRevealStyle(90 + index * 70)}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                  {card.value}
                </p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-500">
                <card.icon className="size-7" />
              </div>
            </div>
            <div className="mt-8 flex items-center gap-2 text-sm text-slate-500">
              <span className="font-semibold text-slate-800">{card.change}</span>
              <span>{card.note}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <article
          className={`home-rise-in rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${
            isReadyToReveal ? "is-visible" : ""
          }`}
          style={getRevealStyle(360)}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 text-slate-950">
                <Activity className="size-6" />
                <h2 className="text-[1.65rem] font-semibold">{activeView.chartTitle}</h2>
              </div>
              <p className="mt-1 text-base text-slate-500">{activeView.chartSubtitle}</p>
            </div>
            <span className="rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-700">
              {activeView.chartBadge}
            </span>
          </div>

          <div className="relative mt-8 rounded-[1.5rem] border border-slate-200 bg-white p-5 sm:p-7">
            <div
              ref={chartRef}
              className="relative mt-8 h-72 touch-none sm:h-80"
              onPointerDown={(event) => updateHoveredChart(event.clientX, event.clientY)}
              onPointerMove={(event) => updateHoveredChart(event.clientX, event.clientY)}
              onPointerLeave={() => setHoveredChart(null)}
            >
              {hoveredChart ? (
                <div
                  className="pointer-events-none absolute z-10 w-52 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg transition-transform duration-75"
                  style={{
                    left: tooltipLeft,
                    top: tooltipTop,
                    transform: "translate(-50%, -100%)",
                  }}
                >
                  {activeView.chartMode === "multi" ? (
                    <>
                      <p className="text-xl font-semibold text-slate-950">
                        {activeMultiPoint.tooltipLabel}
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        {getMultiSeriesStatus(activeMultiPoint)}
                      </p>
                      <div className="mt-3 space-y-2 text-base text-slate-500">
                        <div className="flex items-center gap-3">
                          <span className="h-4 w-4 rounded-full bg-emerald-500" />
                          <span>present:</span>
                          <span className="font-semibold text-slate-950">{activeMultiPoint.present}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="h-4 w-4 rounded-full bg-amber-500" />
                          <span>late:</span>
                          <span className="font-semibold text-slate-950">{activeMultiPoint.late}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-xl font-semibold text-slate-950">{activeSinglePoint.label}</p>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        Attendance records for this point
                      </p>
                      <div className="mt-3 flex items-center gap-3 text-base text-slate-500">
                        <span className="h-4 w-4 rounded-full bg-emerald-500" />
                        <span>count:</span>
                        <span className="font-semibold text-slate-950">{activeSinglePoint.value}</span>
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              <svg
                viewBox={`0 0 ${chartViewBoxWidth} ${chartViewBoxHeight}`}
                className="absolute inset-0 h-full w-full"
                preserveAspectRatio="none"
              >
                {(activeView.chartMode === "multi" ? multiSeriesPoints : singleChartPoints).map((point, index) => (
                  <line
                    key={`${point.label}-grid`}
                    x1={getChartX(index, activeChartLength)}
                    y1={chartPaddingTop}
                    x2={getChartX(index, activeChartLength)}
                    y2={chartViewBoxHeight - chartPaddingBottom}
                    stroke="#e2e8f0"
                    strokeDasharray="4 6"
                  />
                ))}

                {[0, 1, 2, 3, 4].map((step) => {
                  const value = (maxChartValue / 4) * step
                  const y = getChartY(value, maxChartValue)

                  return (
                    <g key={`y-step-${step}`}>
                      <line
                        x1={chartPaddingLeft}
                        y1={y}
                        x2={chartViewBoxWidth - chartPaddingRight}
                        y2={y}
                        stroke="#e2e8f0"
                        strokeDasharray="4 6"
                      />
                      <text
                        x={chartPaddingLeft - 10}
                        y={y + 4}
                        textAnchor="end"
                        fontSize="14"
                        fill="#94a3b8"
                      >
                        {Math.round(value)}
                      </text>
                    </g>
                  )
                })}

                <defs>
                  <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.38" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {activeView.chartMode === "single" ? (
                  <path d={areaPath} fill="url(#attendanceGradient)" opacity="0.32" />
                ) : null}
                <path
                  d={linePath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {activeView.chartMode === "multi" ? (
                  <path
                    d={secondaryLinePath}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}

                {activeView.chartMode === "multi"
                  ? multiSeriesPoints.map((point, index) => (
                      <g key={`${point.label}-points`}>
                        <circle
                          cx={getChartX(index, activeChartLength)}
                          cy={getChartY(point.present, maxChartValue)}
                          r={index === activeIndex ? 6 : 3.5}
                          fill="#10b981"
                        />
                        <circle
                          cx={getChartX(index, activeChartLength)}
                          cy={getChartY(point.late, maxChartValue)}
                          r={index === activeIndex ? 6 : 3.5}
                          fill="#f59e0b"
                        />
                      </g>
                    ))
                  : null}

                <line
                  x1={activePointX}
                  y1={chartPaddingTop}
                  x2={activePointX}
                  y2={chartViewBoxHeight - chartPaddingBottom}
                  stroke="#0f172a"
                  strokeDasharray="5 6"
                  opacity={chartEmpty ? 0.3 : 1}
                />

                <circle
                  cx={activePointX}
                  cy={activePointY}
                  r="7"
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth="3"
                />
                {activeView.chartMode === "multi" ? (
                  <circle
                    cx={activePointX}
                    cy={activeLateY}
                    r="7"
                    fill="#f59e0b"
                    stroke="#ffffff"
                    strokeWidth="3"
                  />
                ) : null}
              </svg>

              <div className="absolute inset-x-0 bottom-0 flex justify-between px-2 text-sm text-slate-400">
                {(activeView.chartMode === "multi" ? multiSeriesPoints : singleChartPoints).map((point, index) => (
                  <span
                    key={`${selectedRange}-${point.label}`}
                    className={`min-w-0 -translate-x-1/2 whitespace-nowrap transition ${
                      index === activeIndex ? "font-semibold text-slate-900" : "text-slate-400"
                    }`}
                    style={{
                      transform:
                        index === 0
                          ? "translateX(0)"
                          : index === activeChartLength - 1
                            ? "translateX(-100%)"
                            : "translateX(-50%)",
                    }}
                  >
                    {point.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </article>

        <article
          className={`home-rise-in rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${
            isReadyToReveal ? "is-visible" : ""
          }`}
          style={getRevealStyle(440)}
        >
          <div>
            <h2 className="text-[1.65rem] font-semibold text-slate-950">
              Status Distribution
            </h2>
            <p className="mt-1 text-base text-slate-500">
              Breakdown by status
            </p>
          </div>

          {distributionTotal ? (
            <div className="mt-8">
              <div className="grid place-items-center">
                <svg viewBox="0 0 120 120" className="h-52 w-52 -rotate-90">
                  <circle
                    cx="60"
                    cy="60"
                    r="36"
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="14"
                  />
                  {activeView.distribution.map((item, index) => {
                    const segment = getDonutSegmentStyle(activeView.distribution, index)

                    return (
                      <circle
                        key={item.label}
                        cx="60"
                        cy="60"
                        r="36"
                        fill="none"
                        stroke={item.color}
                        strokeWidth="14"
                        strokeDasharray={segment.dashArray}
                        strokeDashoffset={segment.dashOffset}
                        strokeLinecap="butt"
                      />
                    )
                  })}
                </svg>
              </div>

              <div className="mt-4 space-y-3">
                {activeView.distribution.map((item) => (
                  <div
                    key={`${selectedRange}-${item.label}`}
                    className="flex items-center justify-between gap-3 text-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-900">{item.label}</span>
                    </div>
                    <span className="font-semibold text-slate-950">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid min-h-80 place-items-center">
              <p className="text-3xl font-medium text-slate-400">No data available</p>
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article
          className={`home-rise-in rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${
            isReadyToReveal ? "is-visible" : ""
          }`}
          style={getRevealStyle(520)}
        >
          <div>
            <div className="flex items-center gap-3 text-slate-950">
              <Waves className="size-6" />
              <h2 className="text-[1.65rem] font-semibold">Recent Activity</h2>
            </div>
            <p className="mt-2 text-base text-slate-500">Last updated: {updatedLabel}</p>
          </div>

          <div className="grid min-h-64 place-items-center">
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                <Waves className="size-10" />
              </div>
              <p className="mt-6 text-3xl font-medium text-slate-500">No activity today</p>
            </div>
          </div>
        </article>

        <article
          className={`home-rise-in rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${
            isReadyToReveal ? "is-visible" : ""
          }`}
          style={getRevealStyle(600)}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 text-slate-950">
                <UsersRound className="size-6" />
                <h2 className="text-[1.65rem] font-semibold">Live Attendance Today</h2>
              </div>
              <p className="mt-2 text-base text-slate-500">Last updated: {updatedLabel}</p>
            </div>

            <button
              type="button"
              onClick={() => setLastUpdated(new Date())}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base font-medium text-slate-900 transition hover:bg-slate-50"
            >
              <RefreshCw className="size-5" />
              Refresh
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Total", value: 0, dot: "bg-black", tone: "bg-slate-50" },
              { label: "Present", value: 0, dot: "bg-slate-500", tone: "bg-slate-50" },
              { label: "Late", value: 0, dot: "bg-slate-400", tone: "bg-slate-50" },
              { label: "Absent", value: 0, dot: "bg-red-500", tone: "bg-red-50" },
            ].map((item) => (
              <div key={item.label} className={`rounded-2xl px-4 py-3 ${item.tone}`}>
                <div className="flex items-center gap-3">
                  <span className={`h-3 w-3 rounded-full ${item.dot}`} />
                  <div>
                    <p className="text-sm text-slate-500">{item.label}</p>
                    <p className="text-4xl font-semibold text-slate-950">{item.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid min-h-64 place-items-center">
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                <UsersRound className="size-10" />
              </div>
              <p className="mt-6 text-3xl font-medium text-slate-500">
                No attendance records today
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article
          className={`home-rise-in rounded-[1.75rem] border border-slate-200 bg-white p-5 text-slate-900 shadow-sm ${
            isReadyToReveal ? "is-visible" : ""
          }`}
          style={getRevealStyle(680)}
        >
          <p className="text-sm font-medium text-slate-500">Signed in as</p>
          <h2 className="mt-3 text-xl font-semibold">{user.name}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{user.email}</p>
        </article>
      </section>
    </div>
  )
}

