"use client"

import * as React from "react"
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Settings2,
} from "lucide-react"

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

const REFERENCE_DATE = new Date("2026-01-30T09:00:00+07:00")
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

function getPresetRange(key: PresetKey): DateRangeValue {
  const today = startOfDay(REFERENCE_DATE)

  switch (key) {
    case "today":
      return {
        key,
        label: "Today",
        start: addDays(today, -1),
        end: endOfDay(today),
      }
    case "yesterday": {
      const yesterday = addDays(today, -1)
      return {
        key,
        label: "Yesterday",
        start: addDays(today, -2),
        end: endOfDay(yesterday),
      }
    }
    case "this_week":
      return { key, label: "This week", start: getStartOfWeek(today), end: getEndOfWeek(today) }
    case "last_7_days":
      return { key, label: "Last 7 days", start: addDays(today, -6), end: endOfDay(today) }
    case "last_week": {
      const start = addDays(getStartOfWeek(today), -7)
      return { key, label: "Last week", start, end: endOfDay(addDays(start, 6)) }
    }
    case "last_2_weeks": {
      const start = addDays(getStartOfWeek(today), -7)
      return { key, label: "Last 2 weeks", start, end: getEndOfWeek(today) }
    }
    case "this_month":
      return { key, label: "This month", start: getStartOfMonth(today), end: getEndOfMonth(today) }
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
    month: "short",
    year: "numeric",
  }).format(new Date(year, month, 1))
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

const summaryCards = [
  { label: "Submitted", value: "0" },
  { label: "Approved", value: "0" },
  { label: "Rejected", value: "0" },
  { label: "Open (Draft)", value: "0" },
]

const approvalStatusOptions = [
  "All Statuses",
  "Submitted",
  "Approved",
  "Rejected",
  "Open (Draft)",
]

const paymentStatusOptions = [
  "All Payment Statuses",
  "Paid",
  "Unpaid",
  "Processing",
]

export default function TimesheetApprovalsPage() {
  const dateRef = React.useRef<HTMLDivElement | null>(null)
  const filterRef = React.useRef<HTMLDivElement | null>(null)
  const [isDateOpen, setIsDateOpen] = React.useState(false)
  const [isFilterOpen, setIsFilterOpen] = React.useState(false)
  const [isApprovalStatusOpen, setIsApprovalStatusOpen] = React.useState(false)
  const [isPaymentStatusOpen, setIsPaymentStatusOpen] = React.useState(false)
  const [rowsPerPage, setRowsPerPage] = React.useState("10")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedMember, setSelectedMember] = React.useState("")
  const [approvalStatus, setApprovalStatus] = React.useState("All Statuses")
  const [paymentStatus, setPaymentStatus] = React.useState("All Payment Statuses")
  const [range, setRange] = React.useState<DateRangeValue>({
    key: "last_month",
    label: "Last month",
    start: new Date("2025-12-31T00:00:00+07:00"),
    end: new Date("2026-01-30T23:59:59+07:00"),
  })

  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (!dateRef.current?.contains(target)) {
        setIsDateOpen(false)
      }

      if (!filterRef.current?.contains(target)) {
        setIsFilterOpen(false)
        setIsApprovalStatusOpen(false)
        setIsPaymentStatusOpen(false)
      }
    }

    window.addEventListener("mousedown", handlePointerDown)
    return () => window.removeEventListener("mousedown", handlePointerDown)
  }, [])

  const visibleMonths = React.useMemo(() => {
    const focusMonth = new Date(range.end.getFullYear(), range.end.getMonth(), 1)
    const nextMonth = new Date(focusMonth.getFullYear(), focusMonth.getMonth() + 1, 1)

    return [
      { year: focusMonth.getFullYear(), month: focusMonth.getMonth() },
      { year: nextMonth.getFullYear(), month: nextMonth.getMonth() },
    ]
  }, [range.end])

  return (
    <div className="space-y-6">
      <section className="rounded-[1rem] border border-slate-200 bg-white p-4 sm:p-6">
        <div className="max-w-[92rem] space-y-6">
          <div className="space-y-3">
            <h1 className="text-[1.6rem] font-semibold tracking-tight text-slate-950">
              Timesheet Approvals
            </h1>
            <div className="inline-flex items-center gap-3 text-[1.05rem] text-slate-950">
              <Settings2 className="size-5" />
              <span>Manage timesheet approvals</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div ref={dateRef} className="relative w-full max-w-[24.25rem]">
              <button
                type="button"
                onClick={() => setIsDateOpen((current) => !current)}
                className="flex w-full items-center justify-between gap-3 rounded-[0.95rem] border border-slate-300 bg-white px-5 py-3 text-left text-[1.05rem] text-slate-950"
              >
                <div className="flex items-center gap-3">
                  <CalendarDays className="size-5 text-slate-500" />
                  <span>{formatRangeLabel(range.start, range.end)}</span>
                </div>
                <ChevronDown className="size-4 text-slate-500" />
              </button>

              {isDateOpen ? (
                <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[56rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[1.3rem] border border-slate-200 bg-white shadow-xl">
                  <div className="grid lg:grid-cols-[12.5rem_1fr]">
                    <div className="border-b border-r border-slate-200 p-5 lg:border-b-0">
                      <div className="space-y-2">
                        {quickPresets.map((preset) => {
                          const active = range.key === preset.key

                          return (
                            <button
                              key={preset.key}
                              type="button"
                              onClick={() => setRange(getPresetRange(preset.key))}
                              className={`w-full rounded-xl px-4 py-3 text-left text-[1.05rem] transition ${
                                active
                                  ? "bg-slate-100 font-medium text-slate-950"
                                  : "text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              {preset.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="mb-2 flex justify-end text-sm text-slate-500">UTC</div>
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
                                  <ChevronLeft className="size-4" />
                                </button>
                                <h2 className="text-[1.1rem] font-semibold text-slate-950">
                                  {monthTitle(year, month)}
                                </h2>
                                <button
                                  type="button"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                                >
                                  <ChevronRight className="size-4" />
                                </button>
                              </div>

                              <div className="grid grid-cols-7 gap-1.5 text-center">
                                {WEEKDAY_LABELS.map((day) => (
                                  <div key={day} className="py-2 text-sm font-semibold text-slate-900">
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
                                      className={`flex h-11 items-center justify-center rounded-[0.75rem] text-[1.05rem] transition ${
                                        selectedStart || selectedEnd
                                          ? "bg-black text-white"
                                          : inRange
                                            ? "bg-slate-100 text-slate-950"
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

                      <div className="mt-5 border-t border-slate-200 pt-5 text-center text-[1.05rem] text-slate-600">
                        {formatRangeLabel(range.start, range.end)}
                      </div>

                      <div className="mt-5 flex items-center gap-3 border-t border-slate-200 pt-5">
                        <button
                          type="button"
                          onClick={() => setIsDateOpen(false)}
                          className="rounded-[0.8rem] bg-black px-6 py-3 text-[1.05rem] font-medium text-white"
                        >
                          Apply
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsDateOpen(false)}
                          className="rounded-[0.8rem] border border-slate-200 px-6 py-3 text-[1.05rem] text-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 xl:max-w-[20rem]">
              <div className="space-y-2">
                <label className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Members
                </label>
                <div className="flex items-center justify-between rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3 shadow-xs">
                  <select
                    value={selectedMember}
                    onChange={(event) => setSelectedMember(event.target.value)}
                    className="w-full appearance-none bg-transparent text-[1.05rem] text-slate-900 outline-hidden"
                  >
                    <option value="">Select members</option>
                    <option value="Miaw">Miaw</option>
                    <option value="Yayan">Yayan</option>
                    <option value="ReryAhmad">ReryAhmad</option>
                    <option value="Riflo">Riflo</option>
                  </select>
                  <ChevronDown className="size-4 text-slate-400" />
                </div>
              </div>

              <div ref={filterRef} className="relative flex items-center rounded-[0.95rem] border border-slate-200 bg-white">
                <div className="flex min-w-0 flex-1 items-center px-4 py-3">
                  <Search className="size-5 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search..."
                    className="min-w-0 flex-1 bg-transparent px-3 text-[1.05rem] outline-hidden placeholder:text-slate-400"
                  />
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <button
                  type="button"
                  onClick={() => {
                    setIsFilterOpen((current) => !current)
                    setIsApprovalStatusOpen(false)
                    setIsPaymentStatusOpen(false)
                  }}
                  className="inline-flex items-center gap-2 px-4 py-3 text-[1.05rem] text-slate-700"
                >
                  <Filter className="size-5" />
                  Filter
                </button>

                {isFilterOpen ? (
                  <div className="absolute left-0 top-[calc(100%+0.5rem)] z-40 w-[25rem] rounded-[1rem] border border-slate-200 bg-white p-5 shadow-xl">
                    <div>
                      <h3 className="text-[1.1rem] font-semibold text-slate-950">Filters</h3>
                      <p className="mt-2 text-[1.05rem] text-slate-500">
                        Refine approvals by status.
                      </p>
                    </div>

                    <div className="mt-5 space-y-4">
                      <div className="space-y-2">
                        <label className="text-[1.05rem] font-medium text-slate-950">
                          Approval Status
                        </label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              setIsApprovalStatusOpen((current) => !current)
                              setIsPaymentStatusOpen(false)
                            }}
                            className="flex w-full items-center justify-between rounded-[0.85rem] border border-slate-200 bg-white px-4 py-3 text-left text-[1.05rem] text-slate-950 shadow-xs"
                          >
                            <span>{approvalStatus}</span>
                            <ChevronDown className="size-4 text-slate-400" />
                          </button>

                          {isApprovalStatusOpen ? (
                            <div className="absolute left-0 top-[calc(100%+0.35rem)] z-50 w-full rounded-[0.9rem] border border-slate-200 bg-white p-2 shadow-xl">
                              {approvalStatusOptions.map((option) => {
                                const active = option === approvalStatus

                                return (
                                  <button
                                    key={option}
                                    type="button"
                                    onClick={() => {
                                      setApprovalStatus(option)
                                      setIsApprovalStatusOpen(false)
                                    }}
                                    className={`flex w-full items-center justify-between rounded-[0.7rem] px-4 py-3 text-left text-[1.05rem] ${
                                      active
                                        ? "bg-slate-100 text-slate-950"
                                        : "text-slate-900 hover:bg-slate-50"
                                    }`}
                                  >
                                    <span>{option}</span>
                                    <span className={active ? "opacity-100" : "opacity-0"}>✓</span>
                                  </button>
                                )
                              })}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[1.05rem] font-medium text-slate-950">
                          Payment Status
                        </label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              setIsPaymentStatusOpen((current) => !current)
                              setIsApprovalStatusOpen(false)
                            }}
                            className="flex w-full items-center justify-between rounded-[0.85rem] border border-slate-200 bg-white px-4 py-3 text-left text-[1.05rem] text-slate-950 shadow-xs"
                          >
                            <span>{paymentStatus}</span>
                            <ChevronDown className="size-4 text-slate-400" />
                          </button>

                          {isPaymentStatusOpen ? (
                            <div className="absolute left-0 top-[calc(100%+0.35rem)] z-50 w-full rounded-[0.9rem] border border-slate-200 bg-white p-2 shadow-xl">
                              {paymentStatusOptions.map((option) => {
                                const active = option === paymentStatus

                                return (
                                  <button
                                    key={option}
                                    type="button"
                                    onClick={() => {
                                      setPaymentStatus(option)
                                      setIsPaymentStatusOpen(false)
                                    }}
                                    className={`flex w-full items-center justify-between rounded-[0.7rem] px-4 py-3 text-left text-[1.05rem] ${
                                      active
                                        ? "bg-slate-100 text-slate-950"
                                        : "text-slate-900 hover:bg-slate-50"
                                    }`}
                                  >
                                    <span>{option}</span>
                                    <span className={active ? "opacity-100" : "opacity-0"}>✓</span>
                                  </button>
                                )
                              })}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid overflow-hidden rounded-[1rem] border border-slate-200 bg-white md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card, index) => (
              <div
                key={card.label}
                className={`px-5 py-5 ${
                  index === 0 ? "" : "border-t border-slate-200 md:border-t-0 md:border-l"
                } ${index >= 2 ? "xl:border-t-0" : ""}`}
              >
                <p className="text-[1.05rem] text-slate-600">{card.label}</p>
                <p className="mt-1 text-[2rem] font-semibold tracking-tight text-slate-950">
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-[1rem] border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-[78rem] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[0.95rem] font-semibold text-slate-950">
                    <th className="w-16 px-4 py-5">
                      <div className="h-5 w-5 rounded-md border border-slate-200 bg-white" />
                    </th>
                    <th className="px-4 py-5">Member</th>
                    <th className="px-4 py-5">Period</th>
                    <th className="px-4 py-5">Total Hours</th>
                    <th className="px-4 py-5">Activity %</th>
                    <th className="px-4 py-5">Payment St.</th>
                    <th className="px-4 py-5">Submitted On</th>
                    <th className="px-4 py-5">Screenshots</th>
                    <th className="px-4 py-5">Status</th>
                    <th className="px-4 py-5">Reason</th>
                    <th className="px-4 py-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={11} className="h-28 px-4 py-8 text-center text-[1.05rem] text-slate-500">
                      No approvals found.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
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
                  className="inline-flex items-center gap-3 rounded-[0.85rem] border border-slate-200 bg-white px-4 py-2"
                >
                  {rowsPerPage}
                  <ChevronDown className="size-4 text-slate-500" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-[0.85rem] border border-slate-200 bg-white text-slate-500"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                className="inline-flex h-11 min-w-11 items-center justify-center rounded-[0.85rem] bg-black px-4 text-sm font-medium text-white"
              >
                1
              </button>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-[0.85rem] border border-slate-200 bg-white text-slate-500"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
