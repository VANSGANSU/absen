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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useSidebar } from "@/components/ui/sidebar"
import {
  sharedDateOptions,
  useSharedDashboardRange,
  type SharedDateOption,
} from "@/lib/shared-dashboard-range"
import { createClient } from "@/lib/supabase/client"
import {
  fetchAttendanceRecords,
  fetchGroups,
  fetchMembers,
  fetchTimesheetRecords,
  type GroupRecord,
  type OrganizationMember,
  type TimesheetRecord
} from "@/lib/dashboard-data"
import { type AttendanceRecordEntry } from "@/lib/attendance-records-store"

// -----------------------------------------------------------------------------
// Animation classes are now defined globally in globals.css to prevent
// duplication and stacking on every render.

// -----------------------------------------------------------------------------
// Types (unchanged)
// -----------------------------------------------------------------------------
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

type InteractiveAttendancePoint = {
  label: string
  tooltipLabel: string
  present?: number
  late?: number
  total?: number
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
  dominantColor: string
  dominantStatus: string
}

// -----------------------------------------------------------------------------
// Chart constants (unchanged)
// -----------------------------------------------------------------------------
const chartViewBoxWidth = 750
const chartViewBoxHeight = 250
const chartPaddingLeft = 52
const chartPaddingRight = 24
const chartPaddingTop = 20
const chartPaddingBottom = 40

// -----------------------------------------------------------------------------
// Helper functions (unchanged)
// -----------------------------------------------------------------------------
function formatDate(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", {
    ...options,
    timeZone: "Asia/Jakarta",
  }).format(date)
}

function parseAttendanceDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

function formatRangeLabel(start: Date, end: Date) {
  if (start.toDateString() === end.toDateString()) {
    return formatDate(start, { month: "short", day: "2-digit", year: "numeric" })
  }
  const startText = formatDate(start, { month: "short", day: "2-digit" })
  const endText = formatDate(end, { month: "short", day: "2-digit", year: "numeric" })
  return `${startText} - ${endText}`
}

function toLocalISOString(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function InteractiveAttendanceTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{
    color?: string
    dataKey?: string
    value?: number
    name?: string
    payload?: InteractiveAttendancePoint
  }>
}) {
  const activePoint = payload?.[0]?.payload
  if (!active || !payload?.length || !activePoint) return null

  return (
    <div className="min-w-48 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
      <p className="text-sm font-semibold text-slate-950">{activePoint.tooltipLabel}</p>
      <div className="mt-3 space-y-2">
        {payload.map((entry) => (
          <div key={String(entry.dataKey)} className="flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color || "#94a3b8" }}
              />
              <span>{entry.name}</span>
            </div>
            <span className="font-semibold text-slate-950">{entry.value ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function getAttendanceStatusKey(status: string | null | undefined) {
  return status?.trim().toLowerCase() ?? ""
}

function parseWorkHoursToHours(value: string | null | undefined) {
  if (!value) return 0

  const normalized = value.trim().toLowerCase()
  const hourMinuteMatch = normalized.match(/(?:(\d+(?:\.\d+)?)h)?(?:\s*(\d+)m)?/)
  if (hourMinuteMatch && (hourMinuteMatch[1] || hourMinuteMatch[2])) {
    const hours = Number(hourMinuteMatch[1] || 0)
    const minutes = Number(hourMinuteMatch[2] || 0)
    return hours + minutes / 60
  }

  const numericValue = Number.parseFloat(normalized)
  return Math.max(0, Number.isFinite(numericValue) ? numericValue : 0)
}

function formatWorkHours(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value : "0h"
}

function getStatusBadgeClass(status: string | null | undefined) {
  const normalized = getAttendanceStatusKey(status)

  if (normalized === "late") {
    return "bg-amber-50 text-amber-700 border border-amber-100"
  }

  if (normalized === "absent") {
    return "bg-red-50 text-red-700 border border-red-100"
  }

  if (normalized === "excused") {
    return "bg-slate-100 text-slate-700 border border-slate-200"
  }

  return "bg-emerald-50 text-emerald-700 border border-emerald-100"
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
  if (pointCount <= 1) return chartPaddingLeft
  return chartPaddingLeft + (index / (pointCount - 1)) * width
}

function getChartY(value: number, maxValue: number) {
  const height = chartViewBoxHeight - chartPaddingTop - chartPaddingBottom
  const safeMax = Math.max(maxValue, 1)
  return chartPaddingTop + height - (Math.max(0, value) / safeMax) * height
}

function buildLinePath(points: ChartPoint[], maxValue: number, curved = false) {
  if (points.length < 2) return ""

  if (!curved) {
    return points
      .map((point, index) => {
        const prefix = index === 0 ? "M" : "L"
        return `${prefix} ${getChartX(index, points.length)} ${getChartY(point.value, maxValue)}`
      })
      .join(" ")
  }

  const tension = 0.08
  let path = `M ${getChartX(0, points.length)} ${getChartY(points[0].value, maxValue)}`

  for (let i = 0; i < points.length - 1; i++) {
    const x0 = getChartX(i, points.length)
    const y0 = getChartY(points[i].value, maxValue)
    const x1 = getChartX(i + 1, points.length)
    const y1 = getChartY(points[i + 1].value, maxValue)

    const dx = (x1 - x0) * tension
    path += ` C ${x0 + dx} ${y0}, ${x1 - dx} ${y1}, ${x1} ${y1}`
  }

  return path
}

function buildMultiLinePath(points: TimeSeriesPoint[], key: "present" | "late", maxValue: number, curved = true) {
  if (points.length < 2) return ""
  const tension = 0.08

  let path = `M ${getChartX(0, points.length)} ${getChartY(points[0][key], maxValue)}`

  for (let i = 0; i < points.length - 1; i++) {
    const x0 = getChartX(i, points.length)
    const y0 = getChartY(points[i][key], maxValue)
    const x1 = getChartX(i + 1, points.length)
    const y1 = getChartY(points[i + 1][key], maxValue)

    const dx = (x1 - x0) * tension
    path += ` C ${x0 + dx} ${y0}, ${x1 - dx} ${y1}, ${x1} ${y1}`
  }

  return path
}

function buildAreaPath(points: ChartPoint[], maxValue: number, curved = false) {
  if (!points.length) return ""
  const linePath = buildLinePath(points, maxValue, curved)
  const lastX = getChartX(points.length - 1, points.length)
  const baseY = chartViewBoxHeight - chartPaddingBottom
  return `${linePath} L ${lastX} ${baseY} L ${chartPaddingLeft} ${baseY} Z`
}

function buildMultiAreaPath(points: TimeSeriesPoint[], key: "present" | "late", maxValue: number) {
  if (!points.length) return ""
  const linePath = buildMultiLinePath(points, key, maxValue, true)
  const lastX = getChartX(points.length - 1, points.length)
  const baseY = chartViewBoxHeight - chartPaddingBottom
  return `${linePath} L ${lastX} ${baseY} L ${chartPaddingLeft} ${baseY} Z`
}

function getIndexFromRelativePosition(relativeX: number, width: number, pointCount: number) {
  if (pointCount <= 1) return 0
  return Math.round(Math.min(1, Math.max(0, relativeX / width)) * (pointCount - 1))
}

function getDonutSegmentStyle(items: DistributionItem[], index: number) {
  const total = items.reduce((sum, item) => sum + item.value, 0)
  if (!total) return { dashArray: "0 100", dashOffset: 0 }
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
  if (point.present === 0 && point.late === 0) return "No attendance"
  if (point.late === 0) return "On time"
  if (point.late >= point.present) return "Late spike"
  return "Mixed patterns"
}

function getRangeBoundaries(selectedRange: string, currentTime: Date) {
  const now = new Date(currentTime)
  let start = new Date(now)
  let end = new Date(now)

  switch (selectedRange) {
    case "Today":
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      break
    case "Yesterday":
      start.setDate(now.getDate() - 1)
      start.setHours(0, 0, 0, 0)
      end.setDate(now.getDate() - 1)
      end.setHours(23, 59, 59, 999)
      break
    case "This week":
      start = getStartOfWeek(now)
      end = getEndOfWeek(now)
      break
    case "This month":
      start = getStartOfMonth(now)
      end = getEndOfMonth(now)
      break
    case "This year":
      start = getStartOfYear(now.getFullYear())
      end = getEndOfYear(now.getFullYear())
      break
    case "Last year":
      start = getStartOfYear(now.getFullYear() - 1)
      end = getEndOfYear(now.getFullYear() - 1)
      break
    case "Last 7 days":
      start.setDate(now.getDate() - 7)
      break
    case "Last 30 days":
      start.setDate(now.getDate() - 30)
      break
  }
  return { start, end }
}

function getComparisonRangeBoundaries(selectedRange: string, currentStart: Date, currentEnd: Date) {
  const start = new Date(currentStart)
  const end = new Date(currentEnd)
  const duration = currentEnd.getTime() - currentStart.getTime() + 1

  let prevStart = new Date(start)
  let prevEnd = new Date(end)

  switch (selectedRange) {
    case "Today":
    case "Yesterday":
      prevStart.setDate(start.getDate() - 1)
      prevEnd.setDate(end.getDate() - 1)
      break
    case "This week":
      prevStart.setDate(start.getDate() - 7)
      prevEnd.setDate(end.getDate() - 7)
      break
    case "This month":
      prevStart = new Date(start.getFullYear(), start.getMonth() - 1, 1)
      prevEnd = new Date(start.getFullYear(), start.getMonth(), 0)
      prevEnd.setHours(23, 59, 59, 999)
      break
    case "This year":
      prevStart = new Date(start.getFullYear() - 1, 0, 1)
      prevEnd = new Date(start.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
      break
    case "Last year":
      prevStart = new Date(start.getFullYear() - 2, 0, 1)
      prevEnd = new Date(start.getFullYear() - 2, 11, 31, 23, 59, 59, 999)
      break
    default:
      prevStart.setTime(start.getTime() - duration)
      prevEnd.setTime(end.getTime() - duration)
      break
  }
  return { start: prevStart, end: prevEnd }
}

function formatChange(current: number, previous: number, type: "percent" | "absolute") {
  // No data in both periods — nothing to show
  if (previous === 0 && current === 0) return "—"

  // No previous period data, only current
  if (previous === 0) {
    const val = Math.round(current * 10) / 10
    return type === "percent" ? `+${Math.round(val)}%` : `+${val}`
  }

  const diff = current - previous

  // Negative change — clamp to 0 (minimum displayed value)
  if (diff < 0) return type === "percent" ? "0%" : "0"

  // No change
  if (diff === 0) return type === "percent" ? "0%" : "0"

  // Positive change
  if (type === "percent") {
    const percent = Math.round((diff / previous) * 100)
    return `+${percent}%`
  }

  return `+${Math.round(diff * 10) / 10}`
}

function createStatCards(
  current: { totalHours: number, activeMembers: number, totalMembersForChange: number, onTimeRate: number, avgHours: number },
  previous: { totalHours: number, activeMembers: number, totalMembersForChange: number, onTimeRate: number, avgHours: number },
  range: string
) {
  const noteSuffix =
    range === "Today" ? "from yesterday" :
      range === "Yesterday" ? "from day before" :
        range === "This week" ? "from last week" :
          range === "This month" ? "from last month" :
            range === "This year" ? "from last year" :
              "from last period"

  return [
    { label: "Total Work Hours", value: `${current.totalHours.toFixed(1)}h`, change: formatChange(current.totalHours, previous.totalHours, "percent"), note: noteSuffix, icon: Clock3 },
    { label: "Active Members", value: String(current.activeMembers), change: formatChange(current.totalMembersForChange, previous.totalMembersForChange, "absolute"), note: noteSuffix, icon: UsersRound },
    { label: "On-Time Rate", value: `${current.onTimeRate}%`, change: formatChange(current.onTimeRate, previous.onTimeRate, "percent"), note: "performance", icon: BellRing },
    { label: "Avg Hours/Member", value: `${current.avgHours.toFixed(1)}h`, change: formatChange(current.avgHours, previous.avgHours, "percent"), note: "per active", icon: TrendingUp },
    { label: "Group with Most Members", value: String(current.activeMembers), change: formatChange(current.totalMembersForChange, previous.totalMembersForChange, "absolute"), note: range === "This week" ? "record week" : noteSuffix, icon: UsersRound },
  ] satisfies StatCardData[]
}


// -----------------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------------
export function DashboardHomeOverview({ user, initialNow }: DashboardHomeOverviewProps) {
  const supabase = React.useMemo(() => createClient(), [])
  const { open: sidebarOpen } = useSidebar()
  const [currentTime, setCurrentTime] = React.useState(() => new Date(initialNow))
  const { selectedRange, setSelectedRange } = useSharedDashboardRange("This week")
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)
  const [menuPlacement, setMenuPlacement] = React.useState<"up" | "down">("down")
  const [lastUpdated, setLastUpdated] = React.useState(() => new Date(initialNow))
  const [selectedPointIndex, setSelectedPointIndex] = React.useState(0)
  const [hoveredChart, setHoveredChart] = React.useState<HoveredChartState | null>(null)
  const dropdownRef = React.useRef<HTMLDivElement | null>(null)
  const chartRef = React.useRef<HTMLDivElement | null>(null)
  const tableScrollRef = React.useRef<HTMLDivElement | null>(null)
  const [scrollProgress, setScrollProgress] = React.useState(0)
  const [thumbWidth, setThumbWidth] = React.useState(30)

  // Live Data States
  const [members, setMembers] = React.useState<OrganizationMember[]>([])
  const [groups, setGroups] = React.useState<GroupRecord[]>([])
  const [attendance, setAttendance] = React.useState<AttendanceRecordEntry[]>([])
  const [timesheets, setTimesheets] = React.useState<TimesheetRecord[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) setIsMenuOpen(false)
    }
    window.addEventListener("mousedown", handlePointerDown)
    return () => window.removeEventListener("mousedown", handlePointerDown)
  }, [])

  React.useEffect(() => {
    const intervalId = window.setInterval(() => setCurrentTime(new Date()), 1000)
    return () => window.clearInterval(intervalId)
  }, [])

  React.useEffect(() => {
    if (!isMenuOpen) return

    const updateMenuPlacement = () => {
      if (!dropdownRef.current) return

      const bounds = dropdownRef.current.getBoundingClientRect()
      const estimatedMenuHeight = 360
      const spaceBelow = window.innerHeight - bounds.bottom
      const spaceAbove = bounds.top
      const shouldOpenUp = spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow

      setMenuPlacement(shouldOpenUp ? "up" : "down")
    }

    updateMenuPlacement()
    window.addEventListener("resize", updateMenuPlacement)
    window.addEventListener("scroll", updateMenuPlacement, true)

    return () => {
      window.removeEventListener("resize", updateMenuPlacement)
      window.removeEventListener("scroll", updateMenuPlacement, true)
    }
  }, [isMenuOpen])

  const todayKey = React.useMemo(() => toLocalISOString(currentTime), [currentTime])

  const loadData = React.useCallback(async (retryCount = 0) => {
    setIsLoading(true)
    try {
      // Fetch each source independently so one failure doesn't block others
      const settled = await Promise.allSettled([
        fetchMembers(supabase),
        fetchGroups(supabase),
        fetchAttendanceRecords(supabase),
        fetchTimesheetRecords(supabase),
      ])

      const [mResult, gResult, aResult, tResult] = settled

      if (mResult.status === "fulfilled") setMembers(mResult.value)
      else console.warn("Members fetch failed:", mResult.reason?.message)

      if (gResult.status === "fulfilled") setGroups(gResult.value)
      else console.warn("Groups fetch failed:", gResult.reason?.message)

      if (aResult.status === "fulfilled") setAttendance(aResult.value)
      else console.warn("Attendance fetch failed:", aResult.reason?.message)

      if (tResult.status === "fulfilled") setTimesheets(tResult.value)
      // timesheets are optional — silently skip

      // Retry once on network error (Failed to fetch)
      const hasNetworkError = settled.some(
        (r) => r.status === "rejected" && r.reason?.message?.includes("Failed to fetch")
      )
      if (hasNetworkError && retryCount < 2) {
        console.warn(`Network error, retrying (attempt ${retryCount + 1})...`)
        await new Promise((resolve) => setTimeout(resolve, 1500 * (retryCount + 1)))
        return loadData(retryCount + 1)
      }

      setLastUpdated(new Date())
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn("Dashboard load error (non-critical):", message)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  React.useEffect(() => {
    void loadData()
  }, [loadData])

  const handleTableScroll = () => {
    const el = tableScrollRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    if (maxScroll <= 0) {
      setScrollProgress(0)
      setThumbWidth(100)
    } else {
      const progress = (el.scrollLeft / maxScroll) * (100 - (el.clientWidth / el.scrollWidth) * 100)
      setScrollProgress(progress)
      setThumbWidth((el.clientWidth / el.scrollWidth) * 100)
    }
  }

  const [sortColumn, setSortColumn] = React.useState<string>("memberName")
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc")

  React.useEffect(() => {
    handleTableScroll()
    window.addEventListener("resize", handleTableScroll)
    return () => window.removeEventListener("resize", handleTableScroll)
  }, [attendance])

  const activeMembers = React.useMemo(
    () => members.filter((member) => member.status === "Active"),
    [members]
  )

  const todayAttendance = React.useMemo(() => {
    let result = attendance.filter((record) => record.date === todayKey)

    result.sort((a, b) => {
      let valA: any = a[sortColumn as keyof typeof a]
      let valB: any = b[sortColumn as keyof typeof b]

      if (sortColumn === "memberGroup") {
        const linkedA = members.find(m => m.id === a.memberId)
        const linkedB = members.find(m => m.id === b.memberId)
        valA = linkedA?.group || a.memberGroup || ""
        valB = linkedB?.group || b.memberGroup || ""
      }

      if (typeof valA === "string") valA = valA.toLowerCase()
      if (typeof valB === "string") valB = valB.toLowerCase()

      if (valA < valB) return sortDirection === "asc" ? -1 : 1
      if (valA > valB) return sortDirection === "asc" ? 1 : -1
      return 0
    })

    return result
  }, [attendance, todayKey, sortColumn, sortDirection, members])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const renderSortIcon = (column: string) => {
    if (sortColumn !== column) return <ArrowUpDown className="size-3.5 text-slate-400" />
    return sortDirection === "asc" ? (
      <ArrowUp className="size-3.5 text-slate-900" />
    ) : (
      <ArrowDown className="size-3.5 text-slate-900" />
    )
  }

  const todayPresentCount = React.useMemo(
    () => todayAttendance.filter((record) => getAttendanceStatusKey(record.status) === "present").length,
    [todayAttendance]
  )

  const todayLateCount = React.useMemo(
    () => todayAttendance.filter((record) => getAttendanceStatusKey(record.status) === "late").length,
    [todayAttendance]
  )

  const todayExcusedCount = React.useMemo(
    () => todayAttendance.filter((record) => getAttendanceStatusKey(record.status) === "excused").length,
    [todayAttendance]
  )

  const todayAbsentCount = React.useMemo(
    () => Math.max(0, activeMembers.length - todayPresentCount - todayLateCount - todayExcusedCount),
    [activeMembers.length, todayPresentCount, todayLateCount, todayExcusedCount]
  )

  const activeView = React.useMemo<DashboardRangeView>(() => {
    const { start, end } = getRangeBoundaries(selectedRange, currentTime)
    const prevRange = getComparisonRangeBoundaries(selectedRange, start, end)

    const rangeRecords = attendance.filter(r => {
      const d = parseAttendanceDate(r.date)
      return d >= start && d <= end
    })

    const prevRecords = attendance.filter(r => {
      const d = parseAttendanceDate(r.date)
      return d >= prevRange.start && d <= prevRange.end
    })

    const calculateStats = (records: AttendanceRecordEntry[], membersInPeriod: OrganizationMember[]) => {
      const activeCount = membersInPeriod.filter(m => m.status === "Active").length
      const totalCount = membersInPeriod.length
      const totalHours = Math.max(0, records.reduce((sum, r) => sum + parseWorkHoursToHours(r.workHours), 0))
      const onTimeCount = records.filter(r => getAttendanceStatusKey(r.status) === "present").length
      const onTimeRate = records.length > 0 ? Math.round((onTimeCount / records.length) * 100) : 0
      const avgHours = activeCount > 0 ? Math.max(0, (totalHours / activeCount)) : 0

      return {
        totalHours,
        activeMembers: activeCount,
        totalMembersForChange: totalCount,
        onTimeRate: Math.max(0, onTimeRate),
        avgHours
      }
    }

    const currentStats = calculateStats(rangeRecords, members)
    // Untuk 'previous', karena kita tidak punya data historis member di state, 
    // kita asumsikan 'lastStats.totalMembersForChange' adalah nilai yang akan dibandingkan.
    // Namun agar '+1' muncul saat user menambah data baru, kita perlu cara menghitungnya.
    // Karena 'members' adalah state live, maka currentStats dan lastStats akan selalu sama jika menggunakan variabel yang sama.
    const lastStats = calculateStats(prevRecords, members) 

    // MODIFIKASI: Agar subtitle "+1" bekerja saat penambahan data baru di sesi yang sama, 
    // idealnya kita butuh data createdAt. Tapi untuk memenuhi permintaan Anda segera:
    // Kita akan gunakan total members saat ini sebagai 'current' dan (total - penambahan) sebagai 'previous' jika memungkinkan.
    // Namun karena 'members' adalah array tunggal, saya akan biarkan logic ini dan memberikan catatan.

    const statusMap = rangeRecords.reduce((acc, r) => {
      const s = r.status || "Unknown"
      acc[s] = (acc[s] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const distribution: DistributionItem[] = Object.entries(statusMap).map(([label, value]) => ({
      label,
      value,
      color: getAttendanceStatusKey(label) === "present"
        ? "#10b981"
        : getAttendanceStatusKey(label) === "late"
          ? "#f59e0b"
          : getAttendanceStatusKey(label) === "absent"
            ? "#ef4444"
            : "#94a3b8"
    })).sort((a, b) => b.value - a.value)

    const topStatus = distribution[0] || { label: "Present", color: "#10b981" }
    const dominantColor = topStatus.color
    const dominantStatus = topStatus.label

    let chartPoints: ChartPoint[] = []
    let timeSeriesPoints: TimeSeriesPoint[] = []
    let chartMode: "single" | "multi" = "single"
    let chartTitle = "Attendance Trend"
    let chartBadge = selectedRange

    if (selectedRange === "This year" || selectedRange === "Last year") {
      chartTitle = "Monthly Attendance"
    }

    if (selectedRange === "Today") {
      chartMode = "multi"
      chartTitle = "Hourly Attendance"
      for (let i = 0; i < 24; i++) {
        const hourRecords = rangeRecords.filter(r => {
          if (!r.checkIn) return false
          const h = parseInt(r.checkIn.split(":")[0])
          return h === i
        })
        timeSeriesPoints.push({
          label: String(i),
          tooltipLabel: `${String(i).padStart(2, '0')}:00`,
          present: hourRecords.filter(r => r.status?.toLowerCase().includes("present")).length,
          late: hourRecords.filter(r => r.status?.toLowerCase().includes("late")).length
        })
      }
    } else if (selectedRange === "This year" || selectedRange === "Last year") {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      chartPoints = months.map((month, idx) => {
        const monthRecords = rangeRecords.filter(r => {
          const d = parseAttendanceDate(r.date)
          return d.getMonth() === idx
        })
        return { label: month, value: monthRecords.length }
      })
    } else {
      chartMode = "multi"

      const dateMap = rangeRecords.reduce((acc, r) => {
        const d = r.date
        if (!acc[d]) acc[d] = { present: 0, late: 0, label: "" }
        const s = r.status?.toLowerCase() || ""
        if (s.includes("late")) {
          acc[d].late++
        } else if (s.includes("present")) {
          acc[d].present++
        }
        return acc
      }, {} as Record<string, { present: number, late: number, label: string }>)

      if (selectedRange === "Yesterday") {
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        for (let i = 0; i < 7; i++) {
          const d = new Date(start)
          d.setDate(d.getDate() - (6 - i))
          const iso = toLocalISOString(d)
          const data = dateMap[iso] || { present: 0, late: 0 }
          timeSeriesPoints.push({
            label: days[d.getDay()],
            tooltipLabel: formatDate(d, { month: "short", day: "2-digit" }),
            present: data.present,
            late: data.late
          })
        }
      } else if (selectedRange === "This week") {
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        for (let idx = 0; idx < 7; idx++) {
          const d = new Date(start)
          d.setDate(d.getDate() + idx)
          const iso = toLocalISOString(d)
          const data = dateMap[iso] || { present: 0, late: 0 }
          timeSeriesPoints.push({
            label: days[d.getDay()],
            tooltipLabel: formatDate(d, { month: "short", day: "2-digit" }),
            present: data.present,
            late: data.late
          })
        }
      } else {
        const diffInDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        const maxPoints = Math.min(diffInDays + 1, 31)

        for (let i = 0; i < maxPoints; i++) {
          const d = new Date(start)
          d.setDate(d.getDate() + i)
          const iso = toLocalISOString(d)
          const data = dateMap[iso] || { present: 0, late: 0 }
          const label = d.getDate() === 1 || i === 0 || i === maxPoints - 1
            ? `${d.getDate()}/${d.getMonth() + 1}`
            : String(d.getDate())

          timeSeriesPoints.push({
            label,
            tooltipLabel: formatDate(d, { month: "short", day: "2-digit" }),
            present: data.present,
            late: data.late
          })
        }

        if (timeSeriesPoints.length < 2) {
          timeSeriesPoints.unshift({ label: "-", tooltipLabel: "-", present: 0, late: 0 })
        }
      }
    }

    return {
      pickerLabel: selectedRange === "Today"
        ? formatDate(currentTime, { month: "short", day: "2-digit", year: "numeric" })
        : formatRangeLabel(start, end),
      statCards: createStatCards(currentStats, lastStats, selectedRange),
      chartTitle,
      chartSubtitle: `Attendance metrics for ${selectedRange.toLowerCase()}`,
      chartBadge,
      chartMode,
      chartPoints,
      timeSeriesPoints,
      distribution,
      dominantColor,
      dominantStatus
    }
  }, [selectedRange, currentTime, attendance, members, activeMembers.length])

  const isToday = selectedRange === "Today"
  const singleChartPoints: ChartPoint[] = activeView.chartPoints ?? []
  const multiSeriesPoints: TimeSeriesPoint[] = activeView.timeSeriesPoints ?? []
  // Normalize the existing selectedRange output so Recharts can render both
  // the single-series and multi-series dashboard views without changing filters.
  const visualChartData = React.useMemo<InteractiveAttendancePoint[]>(() => {
    if (activeView.chartMode === "multi") {
      return multiSeriesPoints.map((point) => ({
        label: isToday ? point.tooltipLabel : point.label,
        tooltipLabel: point.tooltipLabel,
        present: point.present,
        late: point.late,
      }))
    }

    return singleChartPoints.map((point) => ({
      label: point.label,
      tooltipLabel: point.label,
      total: point.value,
    }))
  }, [activeView.chartMode, isToday, multiSeriesPoints, singleChartPoints])
  const activeChartLength = activeView.chartMode === "multi" ? multiSeriesPoints.length : singleChartPoints.length

  const gridIndices = React.useMemo(() => {
    if (activeChartLength <= 1) return [0]
    if (isToday) return Array.from({ length: 24 }, (_, i) => i)
    return Array.from({ length: activeChartLength }, (_, i) => i)
  }, [activeChartLength, isToday])

  React.useEffect(() => {
    const preferredIndex = activeView.chartMode === "multi"
      ? multiSeriesPoints.findIndex((point) => Math.max(point.present, point.late) > 0)
      : singleChartPoints.findIndex((point) => point.value > 0)
    setSelectedPointIndex(preferredIndex >= 0 ? preferredIndex : 0)
    setHoveredChart(null)
  }, [selectedRange, activeView.chartMode, activeChartLength])

  const headingDate = formatDate(currentTime, { weekday: "long", month: "long", day: "2-digit", year: "numeric" })
  const headingTime = formatDate(currentTime, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
  const updatedLabel = formatDate(lastUpdated, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })

  const groupedOptions = sharedDateOptions.reduce<Record<string, SharedDateOption[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
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
    ? (multiSeriesPoints.length >= 2 ? buildMultiLinePath(multiSeriesPoints, "present", maxChartValue) : "")
    : (singleChartPoints.length >= 2 ? buildLinePath(singleChartPoints, maxChartValue, true) : "")
  const secondaryLinePath = activeView.chartMode === "multi" && multiSeriesPoints.length >= 2 ? buildMultiLinePath(multiSeriesPoints, "late", maxChartValue) : ""
  const areaPath = activeView.chartMode === "multi"
    ? (multiSeriesPoints.length >= 2 ? buildMultiAreaPath(multiSeriesPoints, "present", maxChartValue) : "")
    : (singleChartPoints.length >= 2 ? buildAreaPath(singleChartPoints, maxChartValue, true) : "")
  const activePointX = getChartX(activeIndex, activeChartLength)
  const activePointY = activeView.chartMode === "multi" 
    ? (activeMultiPoint ? getChartY(activeMultiPoint.present, maxChartValue) : 0)
    : (activeSinglePoint ? getChartY(activeSinglePoint.value, maxChartValue) : 0)
  const activeLateY = activeView.chartMode === "multi" 
    ? (activeMultiPoint ? getChartY(activeMultiPoint.late, maxChartValue) : 0)
    : activePointY
  const tooltipLeft = hoveredChart ? hoveredChart.x : activePointX
  const tooltipTop = hoveredChart ? hoveredChart.y : 12

  const presentColor = "#10b981"
  const lateColor = "#f59e0b"
  const dominantColor = activeView.dominantColor
  const distributionTotal = activeView.distribution.reduce((sum, item) => sum + item.value, 0)

  const updateHoveredChart = (clientX: number, clientY: number) => {
    if (!chartRef.current) return
    const bounds = chartRef.current.getBoundingClientRect()
    const relativeX = clientX - bounds.left
    const relativeY = clientY - bounds.top
    const nextIndex = getIndexFromRelativePosition(relativeX, bounds.width, activeChartLength)
    const nextX = Math.min(Math.max(relativeX, 116), bounds.width - 116)
    const nextY = Math.min(Math.max(relativeY - 78, 12), bounds.height - 126)
    setHoveredChart({ index: nextIndex, x: nextX, y: nextY })
  }

  const chartEmpty = activeView.chartMode === "multi"
    ? multiSeriesPoints.every((point) => point.present === 0 && point.late === 0)
    : singleChartPoints.every((point) => point.value === 0)

  return (
    <div key={selectedRange} className="dashboard-ui space-y-6">

      {/* --- HEADER SECTION --- */}
      <header className="animate-rise delay-0 relative z-20 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between pb-2">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl xl:text-[1.5rem] leading-tight tracking-tight">Dashboard - MAGANG UBIG</h1>
          <p className="mt-1.5 text-sm sm:text-lg text-slate-500 font-medium">{headingDate} - {headingTime}</p>
        </div>
        <div ref={dropdownRef} className="relative z-30 w-full sm:w-fit">
          <button type="button" onClick={() => setIsMenuOpen((c) => !c)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-700 shadow-sm transition-all hover:bg-slate-50 sm:w-72">
            <div className="flex items-center gap-3"><CalendarDays className="size-5 text-slate-400" /><span className="text-base font-semibold">{activeView.pickerLabel}</span></div>
            <ChevronDown className={`size-4 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {isMenuOpen && (
            <div
              className={`absolute left-0 z-40 w-full max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl max-h-64 overflow-y-auto animate-in fade-in duration-200 sm:w-72 sm:max-w-[min(18rem,calc(100vw-3rem))] sm:max-h-none sm:overflow-visible lg:left-auto lg:right-0 ${menuPlacement === "up"
                ? "bottom-[calc(100%+0.5rem)] slide-in-from-bottom-2 sm:origin-bottom-left lg:origin-bottom-right"
                : "top-[calc(100%+0.5rem)] slide-in-from-top-2 sm:origin-top-left lg:origin-top-right"
                }`}
            >
              {Object.entries(groupedOptions).map(([group, items], idx) => (
                <div key={group} className={idx ? "border-t border-slate-200" : ""}>
                  <div className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50"><CalendarDays className="size-4" />{group}</div>
                  <div className="py-1">
                    {items.map((item) => (
                      <button key={item.label} onClick={() => { setSelectedRange(item.label); setIsMenuOpen(false) }} className={`flex w-full items-center justify-between px-4 py-3 text-left text-base transition ${selectedRange === item.label ? "bg-slate-100/80 text-slate-950 font-semibold" : "text-slate-700 hover:bg-slate-50"}`}>
                        <span>{item.label}</span>
                        {selectedRange === item.label && <Check className="size-4 text-emerald-600" />}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>


      {/* --- STAT CARDS ---
          Untuk menambah card baru:
          1. Tambahkan data di fungsi createStatCards()
          2. Copy salah satu blok <article> di bawah
          3. Ganti index-nya (misal [4], [5], dst)
          4. Sesuaikan delay- animasinya
      */}
      <section className={`grid gap-4 grid-cols-1 sm:grid-cols-2 ${sidebarOpen ? 'xl:grid-cols-4' : 'lg:grid-cols-4'}`}>

        {/* Card 1 */}
        <article key={`${selectedRange}-${activeView.statCards[0]?.label}`} className="animate-rise delay-1 premium-card rounded-[1.75rem] border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500 uppercase tracking-wide">{activeView.statCards[0]?.label}</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{activeView.statCards[0]?.value}</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-500 sm:h-14 sm:w-14 sm:rounded-3xl">
              {activeView.statCards[0]
                ? React.createElement(activeView.statCards[0].icon, { className: "size-6 sm:size-7" })
                : null}
            </div>
          </div>
          <div className="mt-8 flex items-center gap-2 text-sm text-slate-500">
            <span className="font-semibold text-slate-800">{activeView.statCards[0]?.change}</span>
            <span>{activeView.statCards[0]?.note}</span>
          </div>
        </article>

        {/* Card 2 */}
        <article key={`${selectedRange}-${activeView.statCards[1]?.label}`} className="animate-rise delay-2 premium-card rounded-[1.75rem] border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500 uppercase tracking-wide">{activeView.statCards[1]?.label}</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{activeView.statCards[1]?.value}</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-500 sm:h-14 sm:w-14 sm:rounded-3xl">
              {activeView.statCards[1]
                ? React.createElement(activeView.statCards[1].icon, { className: "size-6 sm:size-7" })
                : null}
            </div>
          </div>
          <div className="mt-8 flex items-center gap-2 text-sm text-slate-500">
            <span className="font-semibold text-slate-800">{activeView.statCards[1]?.change}</span>
            <span>{activeView.statCards[1]?.note}</span>
          </div>
        </article>

        {/* Card 3 */}
        <article key={`${selectedRange}-${activeView.statCards[2]?.label}`} className="animate-rise delay-3 premium-card rounded-[1.75rem] border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500 uppercase tracking-wide">{activeView.statCards[2]?.label}</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{activeView.statCards[2]?.value}</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-500 sm:h-14 sm:w-14 sm:rounded-3xl">
              {activeView.statCards[2]
                ? React.createElement(activeView.statCards[2].icon, { className: "size-6 sm:size-7" })
                : null}
            </div>
          </div>
          <div className="mt-8 flex items-center gap-2 text-sm text-slate-500">
            <span className="font-semibold text-slate-800">{activeView.statCards[2]?.change}</span>
            <span>{activeView.statCards[2]?.note}</span>
          </div>
        </article>

        {/* Card 4 */}
        <article key={`${selectedRange}-${activeView.statCards[3]?.label}`} className="animate-rise delay-4 premium-card rounded-[1.75rem] border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500 uppercase tracking-wide">{activeView.statCards[3]?.label}</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{activeView.statCards[3]?.value}</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-500 sm:h-14 sm:w-14 sm:rounded-3xl">
              {activeView.statCards[3]
                ? React.createElement(activeView.statCards[3].icon, { className: "size-6 sm:size-7" })
                : null}
            </div>
          </div>
          <div className="mt-8 flex items-center gap-2 text-sm text-slate-500">
            <span className="font-semibold text-slate-800">{activeView.statCards[3]?.change}</span>
            <span>{activeView.statCards[3]?.note}</span>
          </div>
        </article>

      </section>

      {/* --- GRAFIK & DISTRIBUSI --- */}
      <section className={`grid min-w-0 gap-4 ${sidebarOpen ? '2xl:grid-cols-[1.35fr_0.95fr]' : 'xl:grid-cols-[1.35fr_0.95fr]'}`}>
        <article className="animate-rise delay-2 premium-card min-w-0 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><div className="flex items-center gap-3 text-slate-950"><Activity className="size-6" /><h2 className="text-xl font-bold sm:text-2xl lg:text-[1.65rem]">{activeView.chartTitle}</h2></div><p className="mt-1 text-sm text-slate-500 sm:text-base">{activeView.chartSubtitle}</p></div>
            <span className="rounded-full bg-slate-50 border border-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 tracking-wide">{activeView.chartBadge}</span>
          </div>
          <div className="relative mt-8 rounded-[0.75rem] border border-slate-200 bg-white p-5 sm:p-7 chart-inner" style={{ animationDelay: '200ms' }}>
            {chartEmpty ? (
              <div className="grid min-h-80 place-items-center">
                <p className="text-2xl font-medium text-slate-400">No attendance data available</p>
              </div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart
                    data={visualChartData}
                    margin={{ top: 12, right: 12, left: -15, bottom: 14 }}
                  >
                    <defs>
                      <linearGradient id="interactivePresentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.75} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.08} />
                      </linearGradient>
                      <linearGradient id="interactiveLateGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.75} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.08} />
                      </linearGradient>
                      <linearGradient id="interactiveTotalGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={dominantColor} stopOpacity={0.75} />
                        <stop offset="95%" stopColor={dominantColor} stopOpacity={0.08} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                      tickMargin={16}
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      width={32}
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                      padding={{ bottom: 15 }}
                    />
                    <Tooltip
                      cursor={{ stroke: "#cbd5e1", strokeDasharray: "4 4" }}
                      content={<InteractiveAttendanceTooltip />}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      wrapperStyle={{ paddingBottom: "1rem", fontSize: "12px" }}
                    />
                    {activeView.chartMode === "multi" ? (
                      <>
                        <Area
                          dataKey="late"
                          name="Late"
                          type="natural"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          fill="url(#interactiveLateGradient)"
                        />
                        <Area
                          dataKey="present"
                          name="Present"
                          type="natural"
                          stroke="#10b981"
                          strokeWidth={2}
                          fill="url(#interactivePresentGradient)"
                        />
                      </>
                    ) : (
                      <Area
                        dataKey="total"
                        name="Records"
                        type="natural"
                        stroke={dominantColor}
                        strokeWidth={2}
                        fill="url(#interactiveTotalGradient)"
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </article>

        <article className="animate-rise delay-3 premium-card rounded-[1.75rem] border border-slate-200 bg-white p-5 sm:p-4">
          <div><h2 className="text-[1.65rem] font-semibold text-slate-950">Status Distribution</h2><p className="mt-1 text-base text-slate-500">Breakdown by status</p></div>
          {distributionTotal ? (
            <div className="mt-8 animate-fade" style={{ animationDelay: '250ms' }}>
              <div className="grid place-items-center">
                <svg viewBox="0 0 120 120" className="h-52 w-52 -rotate-90">
                  <circle cx="60" cy="60" r="36" fill="none" stroke="#f1f5f9" strokeWidth="14" />
                  {activeView.distribution.map((item, index) => {
                    const segment = getDonutSegmentStyle(activeView.distribution, index)
                    return <circle key={item.label} cx="60" cy="60" r="36" fill="none" stroke={item.color} strokeWidth="14" strokeDasharray={segment.dashArray} strokeDashoffset={segment.dashOffset} strokeLinecap="butt" />
                  })}
                </svg>
              </div>
              <div className="mt-4 space-y-3">
                {activeView.distribution.map((item) => (
                  <div key={`${selectedRange}-${item.label}`} className="flex items-center justify-between gap-3 text-lg">
                    <div className="flex items-center gap-3"><span className="h-4 w-4 rounded-full" style={{ backgroundColor: item.color }} /><span className="text-slate-900">{item.label}</span></div>
                    <span className="font-semibold text-slate-950">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid min-h-80 place-items-center"><p className="text-3xl font-medium text-slate-400">No data available</p></div>
          )}
        </article>
      </section>

      {/* --- BAGIAN BAWAH: Recent Activity & Live Attendance --- */}
      <section className={`grid min-w-0 gap-4 ${sidebarOpen ? '2xl:grid-cols-2' : 'xl:grid-cols-2'}`}>
        <article className="animate-rise delay-4 premium-card min-w-0 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-4 sm:p-6">
          <div><div className="flex items-center gap-3 text-slate-950"><Waves className="size-6" /><h2 className="text-xl font-bold sm:text-2xl lg:text-[1.65rem]">Recent Activity</h2></div><p className="mt-1 text-sm text-slate-500 sm:text-base">Last updated: {updatedLabel}</p></div>
          <div className="grid min-h-64 place-items-center"><div className="text-center"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-400"><Waves className="size-10" /></div><p className="mt-6 text-2xl font-medium text-slate-400">No activity today</p></div></div>
        </article>
        <article className="animate-rise delay-5 premium-card relative min-w-0 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><div className="flex items-center gap-3 text-slate-950"><UsersRound className="size-6" /><h2 className="text-xl font-bold sm:text-2xl lg:text-[1.65rem]">Live Attendance Today</h2></div><p className="mt-1 text-sm text-slate-500 sm:text-base">Last updated: {updatedLabel}</p></div>
            <button onClick={() => setLastUpdated(new Date())} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 sm:px-4 sm:py-2.5 sm:text-base"><RefreshCw className="size-4 sm:size-5" />Refresh</button>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total", value: members.length, dot: "bg-black", tone: "bg-slate-50", text: "text-slate-900" },
              {
                label: "Present",
                value: todayPresentCount,
                dot: "bg-blue-600",
                tone: "bg-slate-50",
                text: "text-slate-900"
              },
              {
                label: "Late",
                value: todayLateCount,
                dot: "bg-slate-400",
                tone: "bg-slate-50",
                text: "text-slate-900"
              },
              {
                label: "Absent",
                value: todayAbsentCount,
                dot: "bg-red-500",
                tone: "bg-red-50",
                text: "text-red-600"
              }
            ].map((item) => (
              <div key={item.label} className={`rounded-2xl px-4 py-4 ${item.tone}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} />
                  <p className="text-sm font-medium text-slate-500">{item.label}</p>
                </div>
                <p className={`text-3xl font-bold ${item.text}`}>{item.value}</p>
              </div>
            ))}
          </div>

          <div
            ref={tableScrollRef}
            onScroll={handleTableScroll}
            className="mt-8 overflow-x-auto scrollbar-hide pb-20"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
            <table className="w-full border-separate border-spacing-0 min-w-[70rem] table-fixed">
              <thead>
                <tr className="bg-slate-50">
                  <th className="rounded-tl-xl border-y border-l border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-900 w-[30%]">
                    <button onClick={() => handleSort('memberName')} className="flex items-center gap-2 hover:text-slate-900 transition">
                      Member {renderSortIcon('memberName')}
                    </button>
                  </th>
                  <th className="border-y border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-900 w-[20%]">
                    <button onClick={() => handleSort('memberGroup')} className="flex items-center gap-2 hover:text-slate-900 transition">
                      Group {renderSortIcon('memberGroup')}
                    </button>
                  </th>
                  <th className="border-y border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-900 w-[15%]">
                    <button onClick={() => handleSort('status')} className="flex items-center gap-2 hover:text-slate-900 transition">
                      Status {renderSortIcon('status')}
                    </button>
                  </th>
                  <th className="border-y border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-900 w-[15%]">
                    <button onClick={() => handleSort('checkIn')} className="flex items-center gap-2 hover:text-slate-900 transition">
                      Check In {renderSortIcon('checkIn')}
                    </button>
                  </th>
                  <th className="rounded-tr-xl border-y border-r border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-900 w-[20%]">
                    <button onClick={() => handleSort('workHours')} className="flex items-center gap-2 hover:text-slate-900 transition">
                      Work Hours {renderSortIcon('workHours')}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {todayAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                        <UsersRound className="size-8" />
                      </div>
                      <p className="mt-4 text-xl font-medium text-slate-500">No attendance records today</p>
                    </td>
                  </tr>
                ) : (
                  todayAttendance.map((record) => (
                    <tr key={record.id} className="group border-b border-slate-50 last:border-0 hover:bg-transparent">
                      <td className="border-b border-l border-slate-100 px-4 py-4 group-last:rounded-bl-xl">
                        <div className="flex items-center gap-4">
                          <ChevronDown className="size-4 -rotate-90 text-slate-300" />
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 border border-slate-200">
                              {record.memberName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </span>
                            <span className="font-semibold text-slate-900">{record.memberName}</span>
                          </div>
                        </div>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-500 font-medium">
                        {(() => {
                          const linked = members.find(m => m.id === record.memberId)
                          const groupName = linked?.group || record.memberGroup
                          if (!groupName) return <span className="text-slate-300">--</span>
                          return (
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{groupName}</span>
                          )
                        })()}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-4">
                        <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(record.status)}`}>
                          <Check className="size-3.5" />
                          {record.status || "Hadir"}
                        </div>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-4 text-sm font-semibold text-slate-900">{record.checkIn || "--:--"}</td>
                      <td className="border-b border-r border-slate-100 px-4 py-4 text-sm font-medium text-slate-500 group-last:rounded-br-xl">
                        {formatWorkHours(record.workHours)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="absolute bottom-6 left-6 right-6 z-20 flex items-center gap-2">
            <button
              onClick={() => {
                if (tableScrollRef.current) tableScrollRef.current.scrollBy({ left: -200, behavior: "smooth" })
              }}
              className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white/80 text-slate-400 backdrop-blur-sm transition hover:bg-white hover:text-slate-600"
            >
              <ChevronDown className="size-4 rotate-90" />
            </button>
            <div className="h-1.5 flex-1 rounded-full bg-slate-100/50 relative overflow-hidden backdrop-blur-[2px]">
              <div
                className="absolute inset-y-0 bg-slate-400 rounded-full transition-all duration-75"
                style={{
                  left: `${scrollProgress}%`,
                  width: `${thumbWidth}%`
                }}
              />
            </div>
            <button
              onClick={() => {
                if (tableScrollRef.current) tableScrollRef.current.scrollBy({ left: 300, behavior: "smooth" })
              }}
              className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white/80 text-slate-400 backdrop-blur-sm transition hover:bg-white hover:text-slate-600"
            >
              <ChevronDown className="size-4 -rotate-90" />
            </button>
          </div>
        </article>
      </section>

      {/* --- KARTU USER --- */}
      <section className="grid gap-4 lg:grid-cols-3">
        <article className="animate-rise delay-6 rounded-[1.75rem] border border-slate-200 bg-white p-5 text-slate-900">
          <p className="text-sm font-medium text-slate-500">Signed in as</p>
          <h2 className="mt-3 text-xl font-semibold">{user.name}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{user.email}</p>
        </article>
      </section>

    </div>
  )
}
