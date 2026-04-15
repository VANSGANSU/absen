"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  LogIn,
  LogOut,
  Save,
  Search,
  TriangleAlert,
  UserPlus,
  UsersRound,
  X,
  Loader2,
  Plus,
} from "lucide-react"
import {
  computeStatus,
  computeWorkHours,
  loadAttendanceRecords,
  persistAttendanceRecords,
  type AttendanceRecordEntry,
} from "@/lib/attendance-records-store"

type AttendanceAddOverviewProps = {
  initialDate: string
}

type EntryMode = "single" | "batch"
type TimingMode = "realtime" | "retroactive"

type DepartmentOption = "All Departments" | "Absensi" | "General" | "Qurani"

type MemberItem = {
  id: string
  name: string
  department: Exclude<DepartmentOption, "All Departments">
  avatar?: string
  initials: string
}

const members: MemberItem[] = [
  { id: "rery",  name: "ReryAhmad", department: "Absensi", avatar: "", initials: "R" },
  { id: "riflo", name: "Riflo",     department: "Qurani",  initials: "R" },
  { id: "miaw",  name: "Miaw",      department: "General", initials: "M" },
  { id: "yayan", name: "Yayan",     department: "General", initials: "Y" },
]

const departmentOptions: DepartmentOption[] = [
  "All Departments",
  "Absensi",
  "General",
  "Qurani",
]

function formatInputDate(value: string) {
  const [year, month, day] = value.split("-")
  return `${month}/${day}/${year}`
}

function getCalendarCells(date: Date) {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
  const offset = monthStart.getDay()
  const gridStart = new Date(monthStart)
  gridStart.setDate(gridStart.getDate() - offset)
  return Array.from({ length: 42 }, (_, i) => {
    const cellDate = new Date(gridStart)
    cellDate.setDate(gridStart.getDate() + i)
    return { date: cellDate, inMonth: cellDate.getMonth() === date.getMonth() }
  })
}

function getCurrentTime() {
  return new Date().toTimeString().slice(0, 5)
}

type TimeFields = {
  checkIn: string
  breakIn: string
  breakOut: string
  checkOut: string
}

const emptyTimeFields: TimeFields = { checkIn: "", breakIn: "", breakOut: "", checkOut: "" }

type BatchMemberTimes = Record<string, TimeFields>

const timeInputConfigs = [
  { label: "Check In",  field: "checkIn"  as const, icon: LogIn  },
  { label: "Break In",  field: "breakIn"  as const, icon: Coffee },
  { label: "Break Out", field: "breakOut" as const, icon: Coffee },
  { label: "Check Out", field: "checkOut" as const, icon: LogOut },
]

// ── Small time card used inside batch-retroactive member cards ────────────────
function RetroTimeCard({
  label,
  icon: Icon,
  value,
  onChange,
}: {
  label: string
  icon: React.ElementType
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="rounded-[0.9rem] border border-slate-200 bg-white p-2.5">
      <div className="flex items-center gap-1.5">
        <Icon className="size-3.5 text-slate-400" />
        <span className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-500">
          {label}
        </span>
      </div>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-[0.5rem] border border-slate-200 px-1.5 py-1 text-center text-[0.9rem] text-slate-950 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
    </div>
  )
}

export function AttendanceAddOverview({ initialDate }: AttendanceAddOverviewProps) {
  const router = useRouter()

  const [entryMode, setEntryMode]       = React.useState<EntryMode>("single")
  const [timingMode, setTimingMode]     = React.useState<TimingMode>("realtime")
  const [searchQuery, setSearchQuery]   = React.useState("")
  const [selectedMemberId, setSelectedMemberId] = React.useState<string | null>(null)
  const [selectedDepartment, setSelectedDepartment] = React.useState<DepartmentOption>("All Departments")
  const [selectedDate, setSelectedDate]             = React.useState(initialDate)
  const [isDepartmentOpen, setIsDepartmentOpen]     = React.useState(false)
  const [isCalendarOpen, setIsCalendarOpen]         = React.useState(false)
  const [addedBatchMembers, setAddedBatchMembers]   = React.useState<string[]>([])
  const [batchMemberTimes, setBatchMemberTimes]     = React.useState<BatchMemberTimes>({})
  const [isSubmitting, setIsSubmitting]   = React.useState(false)
  const [submitSuccess, setSubmitSuccess] = React.useState(false)

  // Single-entry time fields
  const [timeFields, setTimeFields] = React.useState<TimeFields>(emptyTimeFields)

  // Loading state for realtime stamp actions (3-second delay)
  const [loadingAction, setLoadingAction] = React.useState<keyof TimeFields | null>(null)

  // Session remarks (notes) – UI only, not saved to store
  const [remarks, setRemarks] = React.useState("")

  // Live clock for realtime preview (updates every second)
  const [liveClock, setLiveClock] = React.useState(getCurrentTime)
  React.useEffect(() => {
    const id = window.setInterval(() => setLiveClock(getCurrentTime()), 1000)
    return () => clearInterval(id)
  }, [])

  const departmentRef = React.useRef<HTMLDivElement | null>(null)
  const calendarRef   = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const handleDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!departmentRef.current?.contains(t)) setIsDepartmentOpen(false)
      if (!calendarRef.current?.contains(t))   setIsCalendarOpen(false)
    }
    window.addEventListener("mousedown", handleDown)
    return () => window.removeEventListener("mousedown", handleDown)
  }, [])

  // Reset time fields when member changes (single mode)
  React.useEffect(() => { setTimeFields(emptyTimeFields) }, [selectedMemberId])

  // ── Business rules for realtime stamp availability ──────────────────────────
  const canPerform = React.useCallback(
    (field: keyof TimeFields): boolean => {
      const { checkIn, breakIn } = timeFields
      const now = new Date()
      const currentMinutes = now.getHours() * 60 + now.getMinutes()
      const isBreakTime = currentMinutes >= 7 * 60 + 35 && currentMinutes <= 13 * 60

      switch (field) {
        case "checkIn":
          return true
        case "breakIn":
          return !!checkIn && isBreakTime
        case "breakOut":
          return !!breakIn
        case "checkOut":
          return !!checkIn
        default:
          return false
      }
    },
    [timeFields]
  )

  const handleStamp = (field: keyof TimeFields) => {
    if (loadingAction || !canPerform(field)) return
    setLoadingAction(field)
    setTimeout(() => {
      setTimeFields((prev) => ({ ...prev, [field]: getCurrentTime() }))
      setLoadingAction(null)
    }, 3000)
  }

  const filteredMembers = members.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
    const matchesDept =
      entryMode === "single" || selectedDepartment === "All Departments"
        ? true
        : m.department === selectedDepartment
    return matchesSearch && matchesDept
  })

  const selectedMember = members.find((m) => m.id === selectedMemberId) ?? null
  const currentTimeLabel = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false, timeZone: "Asia/Jakarta",
  }).format(new Date())

  const calendarDate  = React.useMemo(() => new Date(`${selectedDate}T09:00:00+07:00`), [selectedDate])
  const calendarCells = React.useMemo(() => getCalendarCells(calendarDate), [calendarDate])
  const addableCount  = filteredMembers.filter((m) => !addedBatchMembers.includes(m.id)).length

  const updateTimeField = (field: keyof TimeFields, value: string) =>
    setTimeFields((prev) => ({ ...prev, [field]: value }))

  const updateBatchMemberTime = (memberId: string, field: keyof TimeFields, value: string) =>
    setBatchMemberTimes((prev) => ({
      ...prev,
      [memberId]: { ...(prev[memberId] ?? emptyTimeFields), [field]: value },
    }))

  const getBatchMemberTime = (memberId: string): TimeFields =>
    batchMemberTimes[memberId] ?? emptyTimeFields

  const toggleBatchMember = (memberId: string) =>
    setAddedBatchMembers((cur) =>
      cur.includes(memberId) ? cur.filter((id) => id !== memberId) : [...cur, memberId]
    )

  // ── Submit handlers ───────────────────────────────────────────────────────────
  const handleSingleSubmit = () => {
    if (!selectedMember) return
    setIsSubmitting(true)
    const existing = loadAttendanceRecords()
    const checkIn  = timeFields.checkIn  || null
    const checkOut = timeFields.checkOut || null
    persistAttendanceRecords([
      {
        id: `rec_${Date.now()}`,
        memberId: selectedMember.id,
        memberName: selectedMember.name,
        memberDepartment: selectedMember.department,
        date: selectedDate,
        checkIn,
        breakIn:  timeFields.breakIn  || null,
        breakOut: timeFields.breakOut || null,
        checkOut,
        status:    computeStatus(checkIn),
        workHours: computeWorkHours(checkIn, checkOut),
        // remarks not saved to avoid type error
      } satisfies AttendanceRecordEntry,
      ...existing,
    ])
    setSubmitSuccess(true)
    window.setTimeout(() => { router.push("/dashboard/attendance/list"); router.refresh() }, 600)
  }

  const handleBatchSubmit = () => {
    if (!addedBatchMembers.length) return
    setIsSubmitting(true)
    const existing = loadAttendanceRecords()
    const now = getCurrentTime()
    const newRecords: AttendanceRecordEntry[] = addedBatchMembers.map((memberId) => {
      const member  = members.find((m) => m.id === memberId)!
      const times   = getBatchMemberTime(memberId)
      const checkIn  = timingMode === "realtime" ? now    : (times.checkIn  || null)
      const checkOut = timingMode === "realtime" ? null   : (times.checkOut || null)
      return {
        id: `rec_${Date.now()}_${memberId}`,
        memberId: member.id,
        memberName: member.name,
        memberDepartment: member.department,
        date: selectedDate,
        checkIn,
        breakIn:  timingMode === "realtime" ? null : (times.breakIn  || null),
        breakOut: timingMode === "realtime" ? null : (times.breakOut || null),
        checkOut,
        status:    computeStatus(checkIn),
        workHours: computeWorkHours(checkIn, checkOut),
      }
    })
    persistAttendanceRecords([...newRecords, ...existing])
    setSubmitSuccess(true)
    window.setTimeout(() => { router.push("/dashboard/attendance/list"); router.refresh() }, 600)
  }

  // ── Reusable timing mode toggle ───────────────────────────────────────────────
  const TimingModeToggle = () => (
    <div className="inline-flex rounded-[0.95rem] border border-slate-200 bg-white p-1">
      {(["realtime", "retroactive"] as TimingMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => {
            setTimingMode(mode)
            setTimeFields(emptyTimeFields)
            setBatchMemberTimes({})
          }}
          className={`rounded-[0.85rem] px-4 py-2 text-[1.05rem] font-medium transition ${
            timingMode === mode ? "bg-black text-white" : "text-slate-900 hover:bg-slate-50"
          }`}
        >
          {mode === "realtime" ? "Real-time" : "Retroactive"}
        </button>
      ))}
    </div>
  )

  // ── Member avatar ─────────────────────────────────────────────────────────────
  const MemberAvatar = ({ member, isAdded }: { member: MemberItem; isAdded?: boolean }) =>
    member.avatar ? (
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100">
        <img src={member.avatar} alt={member.name} className="h-full w-full object-cover" />
        {isAdded && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-blue-600/80">
            <X className="size-4 text-white" />
          </div>
        )}
      </div>
    ) : (
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border text-[1.05rem] transition ${
        isAdded ? "border-blue-400 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-500"
      }`}>
        {isAdded ? <X className="size-4" /> : member.initials}
      </div>
    )

  // ── Calendar dropdown ─────────────────────────────────────────────────────────
  const CalendarDropdown = () => (
    <div ref={calendarRef} className="relative">
      <button
        type="button"
        onClick={() => setIsCalendarOpen((c) => !c)}
        className="flex min-w-[10.75rem] items-center justify-between gap-3 rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3 text-slate-950"
      >
        <span>{formatInputDate(selectedDate)}</span>
        <CalendarDays className="size-5 text-slate-500" />
      </button>

      {isCalendarOpen && (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-40 w-[17.5rem] overflow-hidden rounded-[1rem] border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <span className="text-[1.1rem] font-semibold text-slate-950">
              {new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(calendarDate)}
            </span>
            <div className="flex items-center gap-2 text-slate-500">
              <ChevronLeft className="size-5" />
              <ChevronRight className="size-5" />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 px-4 pb-4 pt-3 text-center">
            {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
              <div key={d} className="py-2 text-sm font-medium text-slate-500">{d}</div>
            ))}
            {calendarCells.map((cell) => {
              const iso = cell.date.toISOString().slice(0, 10)
              const active = iso === selectedDate
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => { setSelectedDate(iso); setIsCalendarOpen(false) }}
                  className={`flex h-9 items-center justify-center rounded-[0.7rem] text-[1.05rem] ${
                    active ? "bg-blue-600 font-semibold text-white"
                      : cell.inMonth ? "text-slate-900 hover:bg-slate-50"
                      : "text-slate-400"
                  }`}
                >
                  {cell.date.getDate()}
                </button>
              )
            })}
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-[1.05rem]">
            <button type="button" onClick={() => setSelectedDate(initialDate)} className="text-blue-600">Clear</button>
            <button type="button" onClick={() => { setSelectedDate(new Date().toISOString().slice(0,10)); setIsCalendarOpen(false) }} className="text-blue-600">Today</button>
          </div>
        </div>
      )}
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 sm:p-6">
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2.15rem]">
            Add Attendance
          </h1>

          {/* Entry mode tabs */}
          <div className="rounded-[1.1rem] bg-slate-50 p-1">
            <div className="grid grid-cols-2 gap-1">
              {[
                { label: "Single Entry", value: "single" as EntryMode },
                { label: "Batch Entry",  value: "batch"  as EntryMode },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setEntryMode(item.value)
                    if (item.value === "single") { setAddedBatchMembers([]); setBatchMemberTimes({}) }
                  }}
                  className={`rounded-[0.95rem] px-4 py-2.5 text-[1.05rem] font-medium transition ${
                    entryMode === item.value
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Batch-only top bar */}
          {entryMode === "batch" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-4">
                <TimingModeToggle />
                <div className="flex items-center gap-3 text-[1.05rem] text-slate-500">
                  <span>Date:</span>
                  <CalendarDropdown />
                </div>
              </div>
              <p className="text-[1.05rem] text-slate-500">
                {timingMode === "realtime"
                  ? "Real-time mode: Check-in time is automatically set to now() on submit."
                  : "Retroactive mode: Fill in times manually for each member."}
              </p>
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[21rem_1fr]">
            {/* ── Sidebar ── */}
            <aside className="border-r border-slate-200 pr-0 xl:pr-6">
              <div className="space-y-3">
                <div className="flex items-center rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3">
                  <Search className="size-5 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search member..."
                    className="min-w-0 flex-1 bg-transparent px-3 text-[1.05rem] outline-hidden placeholder:text-slate-400"
                  />
                </div>

                {entryMode === "batch" && (
                  <div className="space-y-3">
                    <div ref={departmentRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setIsDepartmentOpen((c) => !c)}
                        className="flex w-full items-center justify-between rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3 text-[1.05rem] text-slate-950"
                      >
                        <span>{selectedDepartment}</span>
                        <ChevronDown className="size-4 text-slate-400" />
                      </button>
                      {isDepartmentOpen && (
                        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-40 w-full overflow-hidden rounded-[1rem] border border-slate-200 bg-white p-2 shadow-xl">
                          {departmentOptions.map((option) => {
                            const active = selectedDepartment === option
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => {
                                  setSelectedDepartment(option)
                                  setAddedBatchMembers([])
                                  setBatchMemberTimes({})
                                  setIsDepartmentOpen(false)
                                }}
                                className={`flex w-full items-center justify-between rounded-[0.7rem] px-4 py-3 text-left text-[1.05rem] ${
                                  active ? "bg-slate-100 text-slate-950" : "text-slate-900 hover:bg-slate-50"
                                }`}
                              >
                                <span>{option}</span>
                                <span className={active ? "opacity-100" : "opacity-0"}>✓</span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={addableCount === 0}
                      onClick={() =>
                        setAddedBatchMembers((cur) => [
                          ...cur,
                          ...filteredMembers.map((m) => m.id).filter((id) => !cur.includes(id)),
                        ])
                      }
                      className="inline-flex w-full items-center justify-center gap-2 rounded-[999px] border border-slate-200 bg-white px-4 py-3 text-[1.05rem] font-medium text-slate-950 disabled:text-slate-400"
                    >
                      <UserPlus className="size-5" />
                      Add All ({addableCount})
                    </button>
                  </div>
                )}
              </div>

              {/* Member list */}
              <div className="mt-5 space-y-2">
                {filteredMembers.map((member) => {
                  const isSelectedSingle = selectedMemberId === member.id
                  const isAddedBatch     = addedBatchMembers.includes(member.id)
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() =>
                        entryMode === "single"
                          ? setSelectedMemberId(member.id)
                          : toggleBatchMember(member.id)
                      }
                      className={`flex w-full items-center gap-4 rounded-[1rem] px-3 py-3 text-left transition ${
                        entryMode === "single"
                          ? isSelectedSingle ? "bg-slate-100" : "hover:bg-slate-50"
                          : isAddedBatch
                            ? "bg-blue-50 ring-1 ring-blue-200"
                            : "hover:bg-slate-50"
                      }`}
                    >
                      <MemberAvatar member={member} isAdded={entryMode === "batch" && isAddedBatch} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-[1.05rem] font-semibold ${entryMode === "batch" && isAddedBatch ? "text-blue-700" : "text-slate-950"}`}>
                          {member.name}
                        </p>
                        <p className="text-[0.95rem] uppercase tracking-[0.08em] text-slate-400">
                          {member.department}
                        </p>
                      </div>
                      {entryMode === "batch" && (
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          isAddedBatch ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                        }`}>
                          {isAddedBatch ? "Added" : "Add"}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </aside>

            {/* ── Main panel ── */}
            <div className="min-h-[34rem] rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-5">

              {/* ════ SINGLE ENTRY ════ */}
              {entryMode === "single" ? (
                selectedMember ? (
                  <div className="space-y-5">
                    {/* Timing mode toggle */}
                    <div className="flex items-center justify-between">
                      <p className="text-[1.05rem] font-medium text-slate-900">Input Mode</p>
                      <TimingModeToggle />
                    </div>

                    {timingMode === "realtime" ? (
                      /* ── NEW REAL‑TIME LAYOUT (VERTICAL STAMPS + PROGRESS BAR) ── */
                      <div className="relative space-y-5">
                        {/* Loading overlay (semi‑transparent grey) */}
                        {loadingAction && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[1.5rem] bg-slate-900/20 backdrop-blur-[1px]">
                            <div className="flex items-center gap-3 rounded-full bg-white/90 px-6 py-3 shadow-lg">
                              <Loader2 className="size-6 animate-spin text-blue-600" />
                              <span className="text-[1.1rem] font-medium text-slate-700">
                                Recording {loadingAction}...
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Header: Shift info & live clock */}
                        <div className="flex items-center justify-between rounded-[1.25rem] border border-slate-200 bg-slate-50/80 p-5">
                          <div>
                            <div className="text-[1.4rem] font-semibold tracking-tight text-slate-900">
                              07:30 - 19:00
                            </div>
                            <div className="mt-0.5 text-[0.95rem] font-medium uppercase tracking-wider text-slate-500">
                              BREAK 07:35 - 13:00
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm uppercase tracking-wider text-slate-400">Current time</div>
                            <div className="text-4xl font-light tabular-nums tracking-tight text-slate-900">
                              {liveClock}
                            </div>
                          </div>
                        </div>

                        {/* Progress bar untuk status break */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-slate-600">
                              {timeFields.checkIn ? (
                                <>Check‑in: {timeFields.checkIn}</>
                              ) : (
                                "Not checked in"
                              )}
                            </span>
                            <span className="text-slate-500">
                              {(() => {
                                const now = new Date()
                                const mins = now.getHours() * 60 + now.getMinutes()
                                if (mins < 7*60+35) return "Break starts at 07:35"
                                if (mins <= 13*60) return "Break available now"
                                return "Break period ended"
                              })()}
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full transition-all duration-500 ${
                                (() => {
                                  const mins = new Date().getHours() * 60 + new Date().getMinutes()
                                  if (mins >= 7*60+35 && mins <= 13*60) return "bg-emerald-500"
                                  return "bg-slate-400"
                                })()
                              }`}
                              style={{
                                width: (() => {
                                  const mins = new Date().getHours() * 60 + new Date().getMinutes()
                                  if (mins < 7*60+35) return "0%"
                                  if (mins > 13*60) return "100%"
                                  const totalBreakMins = (13*60) - (7*60+35)
                                  const elapsed = mins - (7*60+35)
                                  return `${(elapsed / totalBreakMins) * 100}%`
                                })(),
                              }}
                            />
                          </div>
                        </div>

                        {/* Stamp list (vertical) */}
                        <div className="space-y-3">
                          {timeInputConfigs.map((item) => {
                            const filled = !!timeFields[item.field]
                            const isDisabled = !canPerform(item.field) || !!loadingAction
                            const isLoading = loadingAction === item.field
                            const Icon = item.icon

                            return (
                              <div
                                key={item.field}
                                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`rounded-full p-2 ${
                                    filled ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
                                  }`}>
                                    <Icon className="size-5" />
                                  </div>
                                  <div>
                                    <div className="text-[1.1rem] font-semibold uppercase tracking-wide text-slate-800">
                                      {item.label}
                                    </div>
                                    {!canPerform(item.field) && !filled && item.field === "breakIn" && (
                                      <div className="text-sm text-amber-600">
                                        Available 07:35 – 13:00
                                      </div>
                                    )}
                                    {!canPerform(item.field) && !filled && item.field === "breakOut" && (
                                      <div className="text-sm text-amber-600">
                                        Need break‑in first
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className={`text-xl font-mono font-medium ${
                                    filled ? "text-slate-900" : "text-slate-400"
                                  }`}>
                                    {timeFields[item.field] || "--:--"}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleStamp(item.field)}
                                    disabled={isDisabled}
                                    className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                                      isDisabled
                                        ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                                        : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                    }`}
                                  >
                                    {isLoading ? (
                                      <Loader2 className="size-5 animate-spin" />
                                    ) : (
                                      <Plus className="size-5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Session Remarks */}
                        <div className="space-y-2">
                          <label className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                            SESSION REMARKS
                          </label>
                          <textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Notes (optional)..."
                            rows={2}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-[1.05rem] placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        {/* Submit bar */}
                        <div className="flex items-center justify-between gap-4 rounded-[1rem] bg-slate-50 px-5 py-4">
                          <div>
                            <p className="text-[1.05rem] font-semibold text-slate-950">{selectedMember.name}</p>
                            <p className="text-[0.9rem] uppercase tracking-[0.08em] text-slate-400">
                              {selectedMember.department} · {formatInputDate(selectedDate)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleSingleSubmit}
                            disabled={isSubmitting || !timeFields.checkIn}
                            className="inline-flex items-center gap-2 rounded-[0.95rem] bg-black px-6 py-3 text-[1.05rem] font-medium text-white transition disabled:opacity-60"
                          >
                            <Save className="size-5" />
                            {submitSuccess ? "Saved!" : isSubmitting ? "Saving..." : "Submit Entry"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── Retroactive form (unchanged) ── */
                      <>
                        <p className="text-[0.95rem] text-slate-500">
                          Enter times manually for each event.
                        </p>
                        <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-5">
                          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {timeInputConfigs.map((item) => (
                              <div key={item.label} className="space-y-1.5">
                                <label className="flex items-center gap-1.5 text-[0.85rem] font-semibold uppercase tracking-[0.08em] text-slate-500">
                                  <item.icon className="size-3.5" />
                                  {item.label}
                                </label>
                                <input
                                  type="time"
                                  value={timeFields[item.field]}
                                  onChange={(e) => updateTimeField(item.field, e.target.value)}
                                  className="w-full rounded-[0.75rem] border border-slate-200 bg-white px-3 py-2.5 text-center text-[1rem] text-slate-950 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Submit bar for retroactive */}
                        <div className="flex items-center justify-between gap-4 rounded-[1rem] bg-slate-50 px-5 py-4">
                          <div>
                            <p className="text-[1.05rem] font-semibold text-slate-950">{selectedMember.name}</p>
                            <p className="text-[0.9rem] uppercase tracking-[0.08em] text-slate-400">
                              {selectedMember.department} · {formatInputDate(selectedDate)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleSingleSubmit}
                            disabled={isSubmitting || !timeFields.checkIn}
                            className="inline-flex items-center gap-2 rounded-[0.95rem] bg-black px-6 py-3 text-[1.05rem] font-medium text-white transition disabled:opacity-60"
                          >
                            <Save className="size-5" />
                            {submitSuccess ? "Saved!" : isSubmitting ? "Saving..." : "Submit Entry"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="grid min-h-[30rem] place-items-center">
                    <div className="text-center">
                      <Search className="mx-auto size-10 text-slate-400" />
                      <p className="mt-6 text-[1.2rem] text-slate-500">
                        Select a member from the list to start recording attendance
                      </p>
                    </div>
                  </div>
                )

              /* ════ BATCH ENTRY ════ */
              ) : addedBatchMembers.length ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {members
                      .filter((m) => addedBatchMembers.includes(m.id))
                      .map((member) => {
                        const times = getBatchMemberTime(member.id)
                        return (
                          <div key={member.id} className="relative rounded-[1.1rem] border border-slate-200 bg-white p-4">
                            <button
                              type="button"
                              onClick={() => toggleBatchMember(member.id)}
                              className="absolute right-3 top-3 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              aria-label={`Remove ${member.name}`}
                            >
                              <X className="size-4" />
                            </button>

                            <p className="pr-6 text-[1.05rem] font-semibold text-slate-950">{member.name}</p>
                            <p className="text-[0.85rem] uppercase tracking-[0.08em] text-slate-400">
                              {member.department}
                            </p>

                            {timingMode === "realtime" ? (
                              /* Auto-fill preview */
                              <div className="mt-3 rounded-[0.8rem] bg-blue-50 px-3 py-2.5">
                                <div className="flex items-center gap-1.5 text-blue-500">
                                  <Clock className="size-3.5" />
                                  <span className="text-[0.75rem] font-semibold uppercase tracking-[0.06em]">
                                    Check-in · auto-fill on submit
                                  </span>
                                </div>
                                <p className="mt-1 text-[1.15rem] font-semibold text-blue-700">
                                  {liveClock}
                                  <span className="ml-1.5 text-[0.75rem] font-normal text-blue-400">
                                    (approx.)
                                  </span>
                                </p>
                              </div>
                            ) : (
                              /* Manual inputs per member */
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                {timeInputConfigs.map((item) => (
                                  <RetroTimeCard
                                    key={item.field}
                                    label={item.label}
                                    icon={item.icon}
                                    value={times[item.field]}
                                    onChange={(v) => updateBatchMemberTime(member.id, item.field, v)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                  </div>

                  {/* Submit bar */}
                  <div className="flex items-center justify-between gap-4 rounded-[1rem] bg-slate-50 px-5 py-4">
                    <p className="text-[1.05rem] text-slate-600">
                      {addedBatchMembers.length} member{addedBatchMembers.length !== 1 ? "s" : ""} ready ·{" "}
                      {formatInputDate(selectedDate)}
                    </p>
                    <button
                      type="button"
                      onClick={handleBatchSubmit}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 rounded-[0.95rem] bg-black px-6 py-3 text-[1.05rem] font-medium text-white transition disabled:opacity-60"
                    >
                      <Save className="size-5" />
                      {submitSuccess ? "Saved!" : isSubmitting ? "Saving..." : "Submit Batch"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid min-h-[30rem] place-items-center">
                  <div className="text-center">
                    <UsersRound className="mx-auto size-10 text-slate-300" />
                    <p className="mt-6 text-[1.8rem] font-medium text-slate-500">No members added yet</p>
                    <p className="mt-2 text-[1.1rem] text-slate-400">
                      Click any member on the left to add them
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}