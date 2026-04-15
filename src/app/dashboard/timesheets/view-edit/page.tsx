"use client"

import * as React from "react"
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Coffee,
  Filter,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react"

type ViewMode = "Members" | "Week" | "Day"
type PresetKey =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_7_days"
  | "last_week"
  | "last_2_weeks"
  | "this_month"
  | "last_month"

type DateRangeValue = {
  key: PresetKey
  label: string
  start: Date
  end: Date
}

type CalendarCell = {
  date: Date
  inMonth: boolean
}

type BreakEntry = {
  id: string
  start: string
  end: string
  note: string
}

const REFERENCE_DATE = new Date("2026-04-10T09:00:00+07:00")
const MEMBERS = ["All Members", "Miaw", "Yayan", "ReryAhmad", "Riflo"]
const TIMESHEET_STORAGE_KEY = "absensi.timesheets.view-edit"

type TimesheetRow = {
  id: string
  member: string
  project: string
  task: string
  date: string
  start: string
  end: string
  reason: string
  billable: boolean
  source: string
}

function loadRows(): TimesheetRow[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(TIMESHEET_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as TimesheetRow[]) : []
  } catch {
    return []
  }
}

function persistRows(rows: TimesheetRow[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(TIMESHEET_STORAGE_KEY, JSON.stringify(rows))
}
const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]

function cloneDate(date: Date) {
  return new Date(date.getTime())
}

function startOfDay(date: Date) {
  const next = cloneDate(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date: Date) {
  const next = cloneDate(date)
  next.setHours(23, 59, 59, 999)
  return next
}

function addDays(date: Date, amount: number) {
  const next = cloneDate(date)
  next.setDate(next.getDate() + amount)
  return next
}

function getStartOfWeek(date: Date) {
  const next = startOfDay(date)
  const day = (next.getDay() + 6) % 7
  next.setDate(next.getDate() - day)
  return next
}

function getEndOfWeek(date: Date) {
  return endOfDay(addDays(getStartOfWeek(date), 6))
}

function getStartOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function getEndOfMonth(date: Date) {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0))
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function isBetween(date: Date, start: Date, end: Date) {
  const time = startOfDay(date).getTime()
  return time >= startOfDay(start).getTime() && time <= startOfDay(end).getTime()
}

function formatDayDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function formatRangeLabel(start: Date, end: Date) {
  return `${formatDayDate(start)} - ${formatDayDate(end)}`
}

function formatEntryDate(value: string) {
  return formatDayDate(new Date(`${value}T09:00:00+07:00`))
}

function createBreakEntry(): BreakEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    start: "12:00 PM",
    end: "12:30 PM",
    note: "",
  }
}

function getPresetRange(key: PresetKey): DateRangeValue {
  const today = startOfDay(REFERENCE_DATE)

  switch (key) {
    case "today":
      return {
        key,
        label: "Today",
        start: today,
        end: endOfDay(today),
      }
    case "yesterday": {
      const yesterday = addDays(today, -1)
      return {
        key,
        label: "Yesterday",
        start: yesterday,
        end: endOfDay(yesterday),
      }
    }
    case "this_week":
      return {
        key,
        label: "This week",
        start: getStartOfWeek(today),
        end: getEndOfWeek(today),
      }
    case "last_7_days":
      return {
        key,
        label: "Last 7 days",
        start: addDays(today, -6),
        end: endOfDay(today),
      }
    case "last_week": {
      const start = addDays(getStartOfWeek(today), -7)
      return {
        key,
        label: "Last week",
        start,
        end: endOfDay(addDays(start, 6)),
      }
    }
    case "last_2_weeks": {
      const start = addDays(getStartOfWeek(today), -7)
      return {
        key,
        label: "Last 2 weeks",
        start,
        end: getEndOfWeek(today),
      }
    }
    case "this_month":
      return {
        key,
        label: "This month",
        start: getStartOfMonth(today),
        end: getEndOfMonth(today),
      }
    case "last_month": {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      return {
        key,
        label: "Last month",
        start,
        end: endOfDay(new Date(today.getFullYear(), today.getMonth(), 0)),
      }
    }
  }
}

function getCalendarCells(year: number, month: number) {
  const monthStart = new Date(year, month, 1)
  const offset = (monthStart.getDay() + 6) % 7
  const gridStart = addDays(monthStart, -offset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index)
    return {
      date,
      inMonth: date.getMonth() === month,
    } satisfies CalendarCell
  })
}

function monthTitle(year: number, month: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1))
}

export default function TimesheetsViewEditPage() {
  const memberRef = React.useRef<HTMLDivElement | null>(null)
  const dateRef = React.useRef<HTMLDivElement | null>(null)
  const [selectedMember, setSelectedMember] = React.useState("All Members")
  const [memberQuery, setMemberQuery] = React.useState("")
  const [isMemberOpen, setIsMemberOpen] = React.useState(false)
  const [isDateOpen, setIsDateOpen] = React.useState(false)
  const [isFilterOpen, setIsFilterOpen] = React.useState(false)
  const [isAddTimeOpen, setIsAddTimeOpen] = React.useState(false)
  const [viewMode, setViewMode] = React.useState<ViewMode>("Members")
  const [rowsPerPage, setRowsPerPage] = React.useState("10")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [range, setRange] = React.useState<DateRangeValue>(getPresetRange("last_2_weeks"))
  const [filterMember, setFilterMember] = React.useState("")
  const [filterProject, setFilterProject] = React.useState("")
  const [filterSource, setFilterSource] = React.useState("")
  const [filterStatus, setFilterStatus] = React.useState("")
  const [addTimeMember, setAddTimeMember] = React.useState("")
  const [addTimeProject, setAddTimeProject] = React.useState("")
  const [addTimeTask, setAddTimeTask] = React.useState("-- No Task --")
  const [addTimeDate, setAddTimeDate] = React.useState("2026-04-10")
  const [addTimeStart, setAddTimeStart] = React.useState("09:00:00 AM")
  const [addTimeEnd, setAddTimeEnd] = React.useState("05:00:00 PM")
  const [addTimeReason, setAddTimeReason] = React.useState("")
  const [isWorkBreak, setIsWorkBreak] = React.useState(false)
  const [isBillable, setIsBillable] = React.useState(true)
  const [breakEntries, setBreakEntries] = React.useState<BreakEntry[]>([])

  // Data rows
  const [rows, setRows] = React.useState<TimesheetRow[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const isDrawerOpen = isFilterOpen || isAddTimeOpen

  // Load data dari localStorage dengan delay 2 detik
  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setRows(loadRows())
      setIsLoading(false)
    }, 2000)
    return () => window.clearTimeout(timer)
  }, [])

  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node

      if (!memberRef.current?.contains(target)) {
        setIsMemberOpen(false)
      }

      if (!dateRef.current?.contains(target)) {
        setIsDateOpen(false)
      }
    }

    window.addEventListener("mousedown", handlePointerDown)
    return () => window.removeEventListener("mousedown", handlePointerDown)
  }, [])

  React.useEffect(() => {
    document.body.style.overflow = isDrawerOpen ? "hidden" : ""

    return () => {
      document.body.style.overflow = ""
    }
  }, [isDrawerOpen])

  const filteredMembers = MEMBERS.filter((member) =>
    member.toLowerCase().includes(memberQuery.trim().toLowerCase())
  )

  const handleToggleWorkBreak = () => {
    setIsWorkBreak((current) => {
      const next = !current

      if (next) {
        setBreakEntries((entries) => (entries.length > 0 ? entries : [createBreakEntry()]))
      } else {
        setBreakEntries([])
      }

      return next
    })
  }

  const handleAddBreak = () => {
    setBreakEntries((entries) => [...entries, createBreakEntry()])
  }

  const handleBreakChange = (
    id: string,
    field: keyof Omit<BreakEntry, "id">,
    value: string
  ) => {
    setBreakEntries((entries) =>
      entries.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry))
    )
  }

  const handleRemoveBreak = (id: string) => {
    setBreakEntries((entries) => {
      const nextEntries = entries.filter((entry) => entry.id !== id)

      if (nextEntries.length === 0) {
        setIsWorkBreak(false)
      }

      return nextEntries
    })
  }

  const quickPresets: Array<{ key: PresetKey; label: string }> = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "this_week", label: "This week" },
    { key: "last_7_days", label: "Last 7 days" },
    { key: "last_week", label: "Last week" },
    { key: "last_2_weeks", label: "Last 2 weeks" },
    { key: "this_month", label: "This month" },
    { key: "last_month", label: "Last month" },
  ]

  const visibleMonths = [
    { year: 2026, month: 3 },
    { year: 2026, month: 4 },
  ]

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-[1rem] border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-[1.6rem] font-semibold tracking-tight text-slate-950">
              View & Edit Timesheets
            </h1>
          </div>

          <div className="inline-flex w-full rounded-lg border border-slate-200 bg-slate-50 p-1 sm:w-auto">
            {(["Members", "Week", "Day"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`rounded-md px-4 py-1.5 text-base font-medium transition ${
                  viewMode === mode
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="relative flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center">
            <div ref={memberRef} className="relative">
              <button
                type="button"
                onClick={() => setIsMemberOpen((current) => !current)}
                className="flex min-w-44 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-left text-base text-slate-950"
              >
                <span>{selectedMember}</span>
                <ChevronDown className="size-4 text-slate-500" />
              </button>

              {isMemberOpen ? (
                <div className="absolute left-0 top-[calc(100%+0.25rem)] z-50 w-[21rem] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={memberQuery}
                      onChange={(event) => setMemberQuery(event.target.value)}
                      placeholder="Search items"
                      className="w-full rounded-lg border border-slate-300 px-11 py-2.5 text-base outline-hidden placeholder:text-slate-400 focus:border-slate-400"
                    />
                  </div>

                  <div className="mt-4 space-y-2">
                    {filteredMembers.map((member) => {
                      const active = member === selectedMember

                      return (
                        <button
                          key={member}
                          type="button"
                          onClick={() => {
                            setSelectedMember(member)
                            setIsMemberOpen(false)
                          }}
                          className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-base transition ${
                            active ? "bg-slate-100 text-slate-950" : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <span
                            className={`h-3.5 w-3.5 rounded-full border ${
                              active ? "border-black bg-black" : "border-slate-400"
                            }`}
                          />
                          {member}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <div ref={dateRef} className="relative">
              <button
                type="button"
                onClick={() => setIsDateOpen((current) => !current)}
                className="flex min-w-[21rem] items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-left text-base text-slate-950"
              >
                <div className="flex items-center gap-3">
                  <CalendarDays className="size-4 text-slate-500" />
                  <span>{formatRangeLabel(range.start, range.end)}</span>
                </div>
                <ChevronDown className="size-4 text-slate-500" />
              </button>

              {isDateOpen ? (
                <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[56rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                  <div className="grid lg:grid-cols-[13rem_1fr]">
                    <div className="border-b border-r border-slate-200 bg-white p-4 lg:border-b-0">
                      <div className="space-y-2">
                        {quickPresets.map((preset) => {
                          const active = range.key === preset.key

                          return (
                            <button
                              key={preset.key}
                              type="button"
                              onClick={() => setRange(getPresetRange(preset.key))}
                              className={`w-full rounded-2xl px-4 py-3 text-left text-lg transition ${
                                active ? "bg-slate-100 font-medium text-slate-950" : "text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              {preset.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="grid gap-6 lg:grid-cols-2">
                        {visibleMonths.map(({ year, month }) => {
                          const cells = getCalendarCells(year, month)

                          return (
                            <div key={`${year}-${month}`}>
                              <div className="mb-4 flex items-center justify-between">
                                <button
                                  type="button"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                                >
                                  <ChevronLeft className="size-5" />
                                </button>
                                <h2 className="text-[2rem] font-semibold text-slate-900">
                                  {monthTitle(year, month)}
                                </h2>
                                <button
                                  type="button"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                                >
                                  <ChevronRight className="size-5" />
                                </button>
                              </div>

                              <div className="grid grid-cols-7 gap-2 text-center text-lg font-medium text-slate-900">
                                {WEEKDAY_LABELS.map((day) => (
                                  <div key={day} className="py-2">
                                    {day}
                                  </div>
                                ))}

                                {cells.map((cell) => {
                                  const selectedStart = isSameDay(cell.date, range.start)
                                  const selectedEnd = isSameDay(cell.date, range.end)
                                  const inRange = isBetween(cell.date, range.start, range.end)

                                  return (
                                    <div
                                      key={cell.date.toISOString()}
                                      className={`flex h-12 items-center justify-center rounded-xl text-2xl transition ${
                                        selectedStart || selectedEnd
                                          ? "bg-slate-900 text-white"
                                          : inRange
                                            ? "bg-slate-100 text-slate-900"
                                            : cell.inMonth
                                              ? "text-slate-800"
                                              : "text-slate-400"
                                      }`}
                                    >
                                      {cell.date.getDate()}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div className="mt-6 border-t border-slate-200 pt-4 text-center text-xl text-slate-700">
                        {formatRangeLabel(range.start, range.end)}
                      </div>

                      <div className="mt-6 flex items-center gap-8 border-t border-slate-200 pt-6">
                        <button
                          type="button"
                          onClick={() => setIsDateOpen(false)}
                          className="text-[2rem] font-medium text-slate-900"
                        >
                          Apply
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsDateOpen(false)}
                          className="text-[2rem] text-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <span className="text-base text-slate-900">UTC</span>
          </div>

          <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center xl:w-auto">
            <div className="flex min-w-[22rem] items-center rounded-lg border border-slate-200 bg-white px-4 py-2.5">
              <Search className="size-4 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search..."
                className="min-w-0 flex-1 bg-transparent px-3 text-base outline-hidden placeholder:text-slate-400"
              />
              <div className="mx-3 h-6 w-px bg-slate-200" />
              <button
                type="button"
                onClick={() => setIsFilterOpen(true)}
                className="inline-flex items-center gap-2 text-base text-slate-700"
              >
                <Filter className="size-4" />
                Filter
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsAddTimeOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-base font-medium text-slate-950"
            >
              <Plus className="size-4" />
              Add Time
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-[0.9rem] border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-white text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                  <th className="w-16 px-5 py-5">
                    <div className="h-5 w-5 rounded-md border border-slate-200 bg-white" />
                  </th>
                  <th className="px-5 py-4 text-base normal-case tracking-normal text-slate-950">
                    Project
                  </th>
                  <th className="px-5 py-5">Activity</th>
                  <th className="px-5 py-5">Idle</th>
                  <th className="px-5 py-5">Manual</th>
                  <th className="px-5 py-5">Duration</th>
                  <th className="px-5 py-5">Source</th>
                  <th className="px-5 py-5">Time</th>
                  <th className="px-5 py-5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="h-64 px-5 py-10 text-center">
                      <div className="inline-flex items-center gap-3 text-xl text-slate-500">
                        <Loader2 className="size-6 animate-spin text-slate-400" />
                        Memuat data...
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="h-64 px-5 py-10 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                          <Clock3 className="size-7 text-slate-400" />
                        </div>
                        <p className="text-[1.15rem] font-medium text-slate-700">
                          Belum ada data yang tercatat
                        </p>
                        <p className="text-[1rem] text-slate-400">
                          Klik tombol &ldquo;Add Time&rdquo; untuk mulai menambahkan data
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-200 transition hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="h-5 w-5 rounded-md border border-slate-200 bg-white" />
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-base font-medium text-slate-950">{row.project || "—"}</p>
                          {row.task && row.task !== "-- No Task --" && (
                            <p className="text-sm text-slate-400">{row.task}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-base text-slate-500">{row.member || "—"}</td>
                      <td className="px-5 py-4 text-base text-slate-500">—</td>
                      <td className="px-5 py-4 text-base text-slate-500">{row.start} → {row.end}</td>
                      <td className="px-5 py-4 text-base text-slate-500">—</td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                          {row.source}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-base text-slate-500">{row.date}</td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = rows.filter((r) => r.id !== row.id)
                            persistRows(updated)
                            setRows(updated)
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                          aria-label="Delete row"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-5">
              <p>
                Showing <span className="font-semibold text-slate-950">0-0</span> of{" "}
                <span className="font-semibold text-slate-950">0</span> data
              </p>
              <div className="flex items-center gap-3">
                <span>Rows per page:</span>
                <button
                  type="button"
                  onClick={() => setRowsPerPage((current) => (current === "10" ? "25" : "10"))}
                  className="inline-flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2"
                >
                  {rowsPerPage}
                  <ChevronDown className="size-4 text-slate-500" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg bg-slate-500 px-4 text-sm font-medium text-white"
              >
                1
              </button>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {isDrawerOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/30"
          onClick={() => {
            setIsFilterOpen(false)
            setIsAddTimeOpen(false)
          }}
        >
          {isFilterOpen ? (
            <div
              className="absolute right-0 top-0 h-full w-full max-w-md border-l border-slate-200 bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-slate-200 px-8 py-6">
                  <h2 className="text-[2rem] font-semibold text-slate-950">Filters</h2>
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(false)}
                    className="text-slate-500 hover:text-slate-900"
                  >
                    <X className="size-6" />
                  </button>
                </div>

                <div className="space-y-6 px-8 py-6">
                  {[
                    {
                      label: "Member",
                      value: filterMember,
                      onChange: setFilterMember,
                      placeholder: "Select member",
                    },
                    {
                      label: "Project",
                      value: filterProject,
                      onChange: setFilterProject,
                      placeholder: "Select project",
                    },
                    {
                      label: "Source",
                      value: filterSource,
                      onChange: setFilterSource,
                      placeholder: "Select source",
                    },
                    {
                      label: "Approval Status",
                      value: filterStatus,
                      onChange: setFilterStatus,
                      placeholder: "Select status",
                    },
                  ].map((field) => (
                    <div key={field.label} className="space-y-2">
                      <label className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                        {field.label}
                      </label>
                      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <select
                          value={field.value}
                          onChange={(event) => field.onChange(event.target.value)}
                          className="w-full appearance-none bg-transparent text-[1.05rem] text-slate-900 outline-hidden"
                        >
                          <option value="">{field.placeholder}</option>
                          <option value="Option 1">Option 1</option>
                          <option value="Option 2">Option 2</option>
                        </select>
                        <ChevronDown className="size-5 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {isAddTimeOpen ? (
            <div
              className="absolute inset-0 flex items-start justify-center overflow-y-auto px-4 py-8 sm:items-center sm:px-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex max-h-[92vh] w-full max-w-[46.75rem] flex-col overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between px-7 py-7">
                  <h2 className="text-[1.2rem] font-semibold text-slate-950 sm:text-[1.35rem]">Add time</h2>
                  <div className="flex items-center gap-4">
                    <button type="button" className="text-slate-500 hover:text-slate-900">
                      <CircleHelp className="size-6" strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddTimeOpen(false)}
                      className="text-slate-500 hover:text-slate-900"
                    >
                      <X className="size-6" />
                    </button>
                  </div>
                </div>

                <div className="space-y-7 overflow-y-auto px-7 pb-7">
                  <div className="space-y-3">
                    <label className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Member
                    </label>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-center justify-between rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3 shadow-xs">
                        <select
                          value={addTimeMember}
                          onChange={(event) => setAddTimeMember(event.target.value)}
                          className="w-full appearance-none bg-transparent text-[1.05rem] text-slate-900 outline-hidden"
                        >
                          <option value="">Select member</option>
                          {MEMBERS.slice(1).map((member) => (
                            <option key={member} value={member}>
                              {member}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="size-5 text-slate-400" />
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleToggleWorkBreak}
                          aria-pressed={isWorkBreak}
                          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition ${
                            isWorkBreak ? "border-slate-400 bg-slate-300" : "border-slate-300 bg-slate-200"
                          }`}
                        >
                          <span
                            className={`absolute inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm transition ${
                              isWorkBreak ? "left-6" : "left-1"
                            }`}
                          >
                            {isWorkBreak ? (
                              <span className="text-[0.65rem] font-semibold">✓</span>
                            ) : (
                              <X className="size-3.5" />
                            )}
                          </span>
                        </button>
                        <span className="text-[1.05rem] text-slate-500">Work break</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Project*
                    </label>
                    <div className="flex items-center justify-between rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3 shadow-xs">
                      <select
                        value={addTimeProject}
                        onChange={(event) => setAddTimeProject(event.target.value)}
                        className="w-full appearance-none bg-transparent text-[1.05rem] text-slate-900 outline-hidden"
                      >
                        <option value="">Select project</option>
                        <option value="Website Revamp">Website Revamp</option>
                        <option value="Attendance System">Attendance System</option>
                      </select>
                      <ChevronDown className="size-5 text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Tasks
                    </label>
                    <div className="flex items-center justify-between rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3 shadow-xs">
                      <select
                        value={addTimeTask}
                        onChange={(event) => setAddTimeTask(event.target.value)}
                        className="w-full appearance-none bg-transparent text-[1.05rem] text-slate-900 outline-hidden"
                      >
                        <option>-- No Task --</option>
                        <option>Wireframing</option>
                        <option>Development</option>
                      </select>
                      <ChevronDown className="size-5 text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Time Span (+07)*
                    </label>
                    <div className="grid gap-3 sm:grid-cols-[1.4fr_auto_1fr_auto_1fr] sm:items-center">
                      <div className="flex items-center justify-between rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3 shadow-xs">
                        <span className="text-[1.05rem] text-slate-900">
                          {formatEntryDate(addTimeDate)}
                        </span>
                        <CalendarDays className="size-5 text-slate-400" />
                      </div>
                      <span className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">
                        From
                      </span>
                      <div className="flex items-center justify-between rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3 shadow-xs">
                        <input
                          type="text"
                          value={addTimeStart}
                          onChange={(event) => setAddTimeStart(event.target.value)}
                          className="w-full bg-transparent text-[1.05rem] text-slate-900 outline-hidden"
                        />
                        <Clock3 className="size-5 text-slate-400" />
                      </div>
                      <span className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">
                        To
                      </span>
                      <div className="flex items-center justify-between rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3 shadow-xs">
                        <input
                          type="text"
                          value={addTimeEnd}
                          onChange={(event) => setAddTimeEnd(event.target.value)}
                          className="w-full bg-transparent text-[1.05rem] text-slate-900 outline-hidden"
                        />
                        <Clock3 className="size-5 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  {isWorkBreak ? (
                    <div className="rounded-[1rem] border border-slate-200 bg-white px-5 py-6">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Coffee className="size-5 text-slate-500" />
                          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">
                            Breaks
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddBreak}
                          className="inline-flex items-center gap-2 text-[1.05rem] font-medium text-slate-950"
                        >
                          <Plus className="size-5" />
                          Add Break
                        </button>
                      </div>

                      <div className="mt-6 space-y-3">
                        {breakEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className="grid gap-3 lg:grid-cols-[1fr_auto_1fr_1.35fr_auto] lg:items-center"
                          >
                            <div className="flex items-center justify-between rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3 shadow-xs">
                              <input
                                type="text"
                                value={entry.start}
                                onChange={(event) =>
                                  handleBreakChange(entry.id, "start", event.target.value)
                                }
                                className="w-full bg-transparent text-[1.05rem] text-slate-900 outline-hidden"
                              />
                              <Clock3 className="size-5 text-slate-400" />
                            </div>

                            <div className="hidden text-center text-lg text-slate-400 lg:block">-</div>

                            <div className="flex items-center justify-between rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3 shadow-xs">
                              <input
                                type="text"
                                value={entry.end}
                                onChange={(event) =>
                                  handleBreakChange(entry.id, "end", event.target.value)
                                }
                                className="w-full bg-transparent text-[1.05rem] text-slate-900 outline-hidden"
                              />
                              <Clock3 className="size-5 text-slate-400" />
                            </div>

                            <div className="rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3 shadow-xs">
                              <input
                                type="text"
                                value={entry.note}
                                onChange={(event) =>
                                  handleBreakChange(entry.id, "note", event.target.value)
                                }
                                placeholder="Notes"
                                className="w-full bg-transparent text-[1.05rem] text-slate-900 outline-hidden placeholder:text-slate-400"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveBreak(entry.id)}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-[0.95rem] text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                              aria-label="Remove break"
                            >
                              <Trash2 className="size-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <label className="inline-flex items-center gap-3 text-[1.05rem] text-slate-900">
                    <input
                      type="checkbox"
                      checked={isBillable}
                      onChange={(event) => setIsBillable(event.target.checked)}
                      className="h-5 w-5 rounded border-slate-300"
                    />
                    Billable
                  </label>

                  <div className="space-y-3">
                    <label className="text-sm font-semibold uppercase tracking-[0.08em] text-red-500">
                      Reason*
                    </label>
                    <div className="flex items-center justify-between rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3 shadow-xs">
                      <select
                        value={addTimeReason}
                        onChange={(event) => setAddTimeReason(event.target.value)}
                        className="w-full appearance-none bg-transparent text-[1.05rem] text-slate-900 outline-hidden"
                      >
                        <option value="">Why are you editing this time entry?</option>
                        <option value="Manual correction">Manual correction</option>
                        <option value="Missed tracker">Missed tracker</option>
                        <option value="Offline work">Offline work</option>
                      </select>
                      <ChevronDown className="size-5 text-slate-400" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-7 py-6">
                  <button
                    type="button"
                    onClick={() => setIsAddTimeOpen(false)}
                    className="rounded-[0.95rem] border border-slate-200 bg-white px-6 py-3 text-[1.05rem] text-slate-700 shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!addTimeProject) return
                      const newRow: TimesheetRow = {
                        id: `ts_${Date.now()}`,
                        member: addTimeMember,
                        project: addTimeProject,
                        task: addTimeTask,
                        date: addTimeDate,
                        start: addTimeStart,
                        end: addTimeEnd,
                        reason: addTimeReason,
                        billable: isBillable,
                        source: "Manual",
                      }
                      const updated = [newRow, ...rows]
                      persistRows(updated)
                      setRows(updated)
                      setIsAddTimeOpen(false)
                      // Reset form
                      setAddTimeMember("")
                      setAddTimeProject("")
                      setAddTimeTask("-- No Task --")
                      setAddTimeReason("")
                      setBreakEntries([])
                      setIsWorkBreak(false)
                    }}
                    disabled={!addTimeProject}
                    className="rounded-[0.95rem] bg-black px-6 py-3 text-[1.05rem] font-medium text-white disabled:opacity-50"
                  >
                    Add Time
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
