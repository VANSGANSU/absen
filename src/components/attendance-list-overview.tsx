"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react"
import {
  sharedDateOptions,
  useSharedDashboardRange,
  type SharedDashboardRange,
  type SharedDateOption,
} from "@/lib/shared-dashboard-range"
import {
  computeStatus,
  computeWorkHours,
  loadAttendanceRecords,
  persistAttendanceRecords,
  type AttendanceRecordEntry,
  type AttendanceStatus,
} from "@/lib/attendance-records-store"

function formatDate(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", {
    ...options,
    timeZone: "Asia/Jakarta",
  }).format(date)
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

function formatShortRange(start: Date, end: Date) {
  const startText = formatDate(start, { month: "short", day: "2-digit" })
  const endText = formatDate(end, { month: "short", day: "2-digit", year: "numeric" })

  return `${startText} - ${endText}`
}

function getRangeLabel(selectedRange: SharedDashboardRange, currentTime: Date) {
  const today = new Date(currentTime)
  const yesterday = new Date(currentTime)
  yesterday.setDate(yesterday.getDate() - 1)
  const currentYear = currentTime.getFullYear()

  switch (selectedRange) {
    case "Today":
      return formatDate(today, { month: "short", day: "2-digit", year: "numeric" })
    case "Yesterday":
      return formatDate(yesterday, { month: "short", day: "2-digit", year: "numeric" })
    case "This week":
      return formatShortRange(getStartOfWeek(currentTime), getEndOfWeek(currentTime))
    case "This month":
      return formatShortRange(getStartOfMonth(currentTime), getEndOfMonth(currentTime))
    case "This year":
      return formatShortRange(getStartOfYear(currentYear), getEndOfYear(currentYear))
    case "Last year":
      return formatShortRange(getStartOfYear(currentYear - 1), getEndOfYear(currentYear - 1))
    case "Last 7 days": {
      const start = new Date(currentTime)
      start.setDate(start.getDate() - 6)
      return formatShortRange(start, currentTime)
    }
    case "Last 30 days": {
      const start = new Date(currentTime)
      start.setDate(start.getDate() - 29)
      return formatShortRange(start, currentTime)
    }
  }
}

/** Menentukan apakah sebuah record masuk ke range yang dipilih */
function isInRange(record: AttendanceRecordEntry, selectedRange: SharedDashboardRange, now: Date): boolean {
  const recordDate = new Date(`${record.date}T00:00:00+07:00`)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  switch (selectedRange) {
    case "Today": {
      return record.date === today.toISOString().slice(0, 10)
    }
    case "Yesterday": {
      const yest = new Date(today)
      yest.setDate(yest.getDate() - 1)
      return record.date === yest.toISOString().slice(0, 10)
    }
    case "This week": {
      const start = getStartOfWeek(today)
      const end = getEndOfWeek(today)
      return recordDate >= start && recordDate <= end
    }
    case "This month": {
      const start = getStartOfMonth(today)
      const end = getEndOfMonth(today)
      return recordDate >= start && recordDate <= end
    }
    case "This year": {
      const start = getStartOfYear(today.getFullYear())
      const end = getEndOfYear(today.getFullYear())
      return recordDate >= start && recordDate <= end
    }
    case "Last year": {
      const start = getStartOfYear(today.getFullYear() - 1)
      const end = getEndOfYear(today.getFullYear() - 1)
      return recordDate >= start && recordDate <= end
    }
    case "Last 7 days": {
      const start = new Date(today)
      start.setDate(start.getDate() - 6)
      return recordDate >= start && recordDate <= today
    }
    case "Last 30 days": {
      const start = new Date(today)
      start.setDate(start.getDate() - 29)
      return recordDate >= start && recordDate <= today
    }
  }
}

const STATUS_MAP: Record<AttendanceStatus, { label: string; style: string }> = {
  Present: { label: "Present", style: "bg-emerald-500 text-white" },
  Late: { label: "Late", style: "bg-amber-500 text-white" },
  Absent: { label: "Absent", style: "bg-red-100 text-red-700" },
  Excused: { label: "Excused", style: "bg-blue-100 text-blue-700" },
}

const statusOptions = ["All Status", "Present", "Late", "Absent", "Excused"] as const
const groupOptions = ["All Groups"] as const

const ROWS_OPTIONS = [10, 25, 50] as const

type NewEntryForm = {
  memberName: string
  memberDepartment: string
  date: string
  checkIn: string
  breakIn: string
  breakOut: string
  checkOut: string
}

const EMPTY_FORM: NewEntryForm = {
  memberName: "",
  memberDepartment: "",
  date: new Date().toISOString().slice(0, 10),
  checkIn: "",
  breakIn: "",
  breakOut: "",
  checkOut: "",
}

export function AttendanceListOverview() {
  const router = useRouter()
  const { selectedRange, setSelectedRange } = useSharedDashboardRange("This week")
  const [currentTime, setCurrentTime] = React.useState(() => new Date())
  const [rowsPerPage, setRowsPerPage] = React.useState(10)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedStatus, setSelectedStatus] = React.useState<(typeof statusOptions)[number]>(
    "All Status"
  )
  const [selectedGroup, setSelectedGroup] = React.useState<(typeof groupOptions)[number]>(
    "All Groups"
  )
  const [isDateOpen, setIsDateOpen] = React.useState(false)
  const [isStatusOpen, setIsStatusOpen] = React.useState(false)
  const [isGroupOpen, setIsGroupOpen] = React.useState(false)
  const [isOpeningEntry, setIsOpeningEntry] = React.useState(false)
  const [records, setRecords] = React.useState<AttendanceRecordEntry[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [showAddForm, setShowAddForm] = React.useState(false)
  const [newForm, setNewForm] = React.useState<NewEntryForm>(EMPTY_FORM)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editForm, setEditForm] = React.useState<NewEntryForm>(EMPTY_FORM)

  const dateRef = React.useRef<HTMLDivElement | null>(null)
  const statusRef = React.useRef<HTMLDivElement | null>(null)
  const groupRef = React.useRef<HTMLDivElement | null>(null)

  // Load data dari localStorage dengan delay 2 detik
  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setRecords(loadAttendanceRecords())
      setIsLoading(false)
    }, 2000)
    return () => window.clearTimeout(timer)
  }, [])

  React.useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node

      if (!dateRef.current?.contains(target)) {
        setIsDateOpen(false)
      }

      if (!statusRef.current?.contains(target)) {
        setIsStatusOpen(false)
      }

      if (!groupRef.current?.contains(target)) {
        setIsGroupOpen(false)
      }
    }

    window.addEventListener("mousedown", handlePointerDown)
    return () => window.removeEventListener("mousedown", handlePointerDown)
  }, [])

  // Reset ke halaman 1 saat filter berubah
  React.useEffect(() => {
    setCurrentPage(1)
  }, [selectedRange, selectedStatus, selectedGroup, searchQuery])

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

  const pickerLabel = React.useMemo(
    () => getRangeLabel(selectedRange, currentTime),
    [selectedRange, currentTime]
  )

  // Filter records
  const filteredRecords = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return records.filter((record) => {
      // Filter range tanggal
      if (!isInRange(record, selectedRange, currentTime)) return false

      // Filter status
      if (selectedStatus !== "All Status" && record.status !== selectedStatus) return false

      // Filter search
      if (
        query &&
        !record.memberName.toLowerCase().includes(query) &&
        !record.memberDepartment.toLowerCase().includes(query) &&
        !record.date.includes(query)
      ) {
        return false
      }

      return true
    })
  }, [records, selectedRange, selectedStatus, searchQuery, currentTime])

  // Paginasi
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / rowsPerPage))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedRecords = filteredRecords.slice(
    (safePage - 1) * rowsPerPage,
    safePage * rowsPerPage
  )

  const showFrom = filteredRecords.length === 0 ? 0 : (safePage - 1) * rowsPerPage + 1
  const showTo = Math.min(safePage * rowsPerPage, filteredRecords.length)

  const handleOpenEntry = async () => {
    setIsOpeningEntry(true)

    try {
      const response = await fetch("/api/navigation/attendance-add-access", {
        method: "POST",
      })

      if (!response.ok) {
        return
      }

      router.push("/dashboard/attendance/add")
      router.refresh()
    } finally {
      setIsOpeningEntry(false)
    }
  }

  const handleDeleteRecord = (id: string) => {
    const updated = records.filter((r) => r.id !== id)
    persistAttendanceRecords(updated)
    setRecords(updated)
  }

  const handleReset = () => {
    setSearchQuery("")
    setSelectedStatus("All Status")
    setSelectedGroup("All Groups")
  }

  // ── Inline Add ──────────────────────────────────────────────
  const handleAddSubmit = () => {
    if (!newForm.memberName.trim() || !newForm.date) return

    const checkIn = newForm.checkIn || null
    const checkOut = newForm.checkOut || null

    const record: AttendanceRecordEntry = {
      id: `rec_${Date.now()}`,
      memberId: `manual_${Date.now()}`,
      memberName: newForm.memberName.trim(),
      memberDepartment: newForm.memberDepartment.trim() || "—",
      date: newForm.date,
      checkIn,
      breakIn: newForm.breakIn || null,
      breakOut: newForm.breakOut || null,
      checkOut,
      status: computeStatus(checkIn),
      workHours: computeWorkHours(checkIn, checkOut),
    }

    const updated = [record, ...records]
    persistAttendanceRecords(updated)
    setRecords(updated)
    setNewForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10) })
    setShowAddForm(false)
  }

  // ── Inline Edit ──────────────────────────────────────────────
  const handleStartEdit = (record: AttendanceRecordEntry) => {
    setEditingId(record.id)
    setEditForm({
      memberName: record.memberName,
      memberDepartment: record.memberDepartment,
      date: record.date,
      checkIn: record.checkIn ?? "",
      breakIn: record.breakIn ?? "",
      breakOut: record.breakOut ?? "",
      checkOut: record.checkOut ?? "",
    })
  }

  const handleEditSave = (id: string) => {
    const checkIn = editForm.checkIn || null
    const checkOut = editForm.checkOut || null

    const updated = records.map((r) => {
      if (r.id !== id) return r
      return {
        ...r,
        memberName: editForm.memberName.trim() || r.memberName,
        memberDepartment: editForm.memberDepartment.trim() || r.memberDepartment,
        date: editForm.date || r.date,
        checkIn,
        breakIn: editForm.breakIn || null,
        breakOut: editForm.breakOut || null,
        checkOut,
        status: computeStatus(checkIn),
        workHours: computeWorkHours(checkIn, checkOut),
      }
    })

    persistAttendanceRecords(updated)
    setRecords(updated)
    setEditingId(null)
  }

  const handleEditCancel = () => {
    setEditingId(null)
  }


  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 sm:p-6">
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2.15rem]">
            Attendance list
          </h1>

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
            <div className="flex min-w-0 flex-1 items-center rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3">
              <Search className="size-5 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name, department, date..."
                className="min-w-0 flex-1 bg-transparent px-3 text-[1.05rem] text-slate-900 outline-hidden placeholder:text-slate-400"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <div ref={dateRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsDateOpen((current) => !current)}
                  className="flex min-w-[18rem] items-center justify-between gap-3 rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3 text-[1.05rem] text-slate-950"
                >
                  <div className="flex items-center gap-3">
                    <CalendarDays className="size-5 text-slate-500" />
                    <span>{pickerLabel}</span>
                  </div>
                  <ChevronDown className="size-4 text-slate-400" />
                </button>

                {isDateOpen ? (
                  <div className="absolute left-0 top-[calc(100%+0.5rem)] z-40 w-[19rem] overflow-hidden rounded-[1rem] border border-slate-200 bg-white shadow-xl">
                    {Object.entries(groupedOptions).map(([group, items], index) => (
                      <div key={group} className={index ? "border-t border-slate-200" : ""}>
                        <div className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-500">
                          <CalendarDays className="size-4" />
                          {group}
                        </div>
                        <div className="pb-2">
                          {items.map((item) => {
                            const active = selectedRange === item.label

                            return (
                              <button
                                key={item.label}
                                type="button"
                                onClick={() => {
                                  setSelectedRange(item.label)
                                  setIsDateOpen(false)
                                }}
                                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-[1.05rem] ${
                                  active
                                    ? "bg-slate-100 text-slate-950"
                                    : "text-slate-900 hover:bg-slate-50"
                                }`}
                              >
                                <span>{item.label}</span>
                                <Check className={`size-4 ${active ? "opacity-100" : "opacity-0"}`} />
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div ref={statusRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsStatusOpen((current) => !current)}
                  className="flex min-w-[10.5rem] items-center justify-between gap-3 rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3 text-[1.05rem] text-slate-950"
                >
                  <span>{selectedStatus}</span>
                  <ChevronDown className="size-4 text-slate-400" />
                </button>

                {isStatusOpen ? (
                  <div className="absolute left-0 top-[calc(100%+0.5rem)] z-40 w-[11rem] overflow-hidden rounded-[1rem] border border-slate-200 bg-white p-2 shadow-xl">
                    {statusOptions.map((option) => {
                      const active = selectedStatus === option

                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setSelectedStatus(option)
                            setIsStatusOpen(false)
                          }}
                          className={`flex w-full items-center justify-between rounded-[0.7rem] px-4 py-3 text-left text-[1.05rem] ${
                            active
                              ? "bg-slate-100 text-slate-950"
                              : "text-slate-900 hover:bg-slate-50"
                          }`}
                        >
                          <span>{option}</span>
                          <Check className={`size-4 ${active ? "opacity-100" : "opacity-0"}`} />
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>

              <div ref={groupRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsGroupOpen((current) => !current)}
                  className="flex min-w-[12.5rem] items-center justify-between gap-3 rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3 text-[1.05rem] text-slate-950"
                >
                  <span>{selectedGroup}</span>
                  <ChevronDown className="size-4 text-slate-400" />
                </button>

                {isGroupOpen ? (
                  <div className="absolute left-0 top-[calc(100%+0.5rem)] z-40 w-[12.5rem] overflow-hidden rounded-[1rem] border border-slate-200 bg-white p-2 shadow-xl">
                    {groupOptions.map((option) => {
                      const active = selectedGroup === option

                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setSelectedGroup(option)
                            setIsGroupOpen(false)
                          }}
                          className={`flex w-full items-center justify-between rounded-[0.7rem] px-4 py-3 text-left text-[1.05rem] ${
                            active
                              ? "bg-slate-100 text-slate-950"
                              : "text-slate-900 hover:bg-slate-50"
                          }`}
                        >
                          <span>{option}</span>
                          <Check className={`size-4 ${active ? "opacity-100" : "opacity-0"}`} />
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="inline-flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-[0.95rem] bg-black text-white"
                aria-label="Reset filters"
              >
                <RotateCcw className="size-5" />
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-3 rounded-[0.95rem] border border-slate-200 bg-white px-5 py-3 text-[1.05rem] font-medium text-slate-950"
              >
                <Download className="size-5" />
                Import
              </button>

              {/* Tambah data langsung (inline) */}
              <button
                type="button"
                onClick={() => setShowAddForm((v) => !v)}
                className="inline-flex items-center gap-3 rounded-[0.95rem] border border-emerald-600 bg-emerald-600 px-5 py-3 text-[1.05rem] font-medium text-white transition hover:bg-emerald-700"
              >
                
              </button>

              <button
                type="button"
                onClick={handleOpenEntry}
                disabled={isOpeningEntry}
                className="inline-flex items-center gap-3 rounded-[0.95rem] bg-black px-5 py-3 text-[1.05rem] font-medium text-white disabled:opacity-70"
              >
                <Plus className="size-5" />
                {isOpeningEntry ? "Opening..." : "Entry"}
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[1rem] border border-slate-200 bg-white">
            {/* ── Loading State ── */}
            {isLoading ? (
              <div className="flex h-64 items-center justify-center gap-3 text-slate-500">
                <Loader2 className="size-6 animate-spin text-slate-400" />
                <span className="text-[1.05rem]">Memuat data absensi...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[92rem] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-left text-[0.95rem] font-semibold uppercase tracking-[0.08em] text-slate-950">
                      <th className="w-16 px-4 py-5">
                        <div className="h-5 w-5 rounded-md border border-slate-400 bg-white" />
                      </th>
                      <th className="px-4 py-5">Member</th>
                      <th className="px-4 py-5">Department</th>
                      <th className="px-4 py-5">Date</th>
                      <th className="px-4 py-5">Check In</th>
                      <th className="px-4 py-5">Break In</th>
                      <th className="px-4 py-5">Break Out</th>
                      <th className="px-4 py-5">Check Out</th>
                      <th className="px-4 py-5">Work Hours</th>
                      <th className="px-4 py-5">Status</th>
                      <th className="px-4 py-5">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* ── Inline Add Row ── */}
                    {showAddForm ? (
                      <tr className="border-t border-emerald-200 bg-emerald-50">
                        <td className="px-4 py-3">
                          <div className="h-5 w-5 rounded-md border border-slate-300 bg-white" />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            placeholder="Nama member"
                            value={newForm.memberName}
                            onChange={(e) => setNewForm((f) => ({ ...f, memberName: e.target.value }))}
                            className="w-full rounded-[0.6rem] border border-slate-300 px-2 py-1.5 text-[0.95rem] text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            placeholder="Department"
                            value={newForm.memberDepartment}
                            onChange={(e) => setNewForm((f) => ({ ...f, memberDepartment: e.target.value }))}
                            className="w-full rounded-[0.6rem] border border-slate-300 px-2 py-1.5 text-[0.95rem] text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            value={newForm.date}
                            onChange={(e) => setNewForm((f) => ({ ...f, date: e.target.value }))}
                            className="rounded-[0.6rem] border border-slate-300 px-2 py-1.5 text-[0.95rem] text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="time"
                            value={newForm.checkIn}
                            onChange={(e) => setNewForm((f) => ({ ...f, checkIn: e.target.value }))}
                            className="rounded-[0.6rem] border border-slate-300 px-2 py-1.5 text-[0.95rem] text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="time"
                            value={newForm.breakIn}
                            onChange={(e) => setNewForm((f) => ({ ...f, breakIn: e.target.value }))}
                            className="rounded-[0.6rem] border border-slate-300 px-2 py-1.5 text-[0.95rem] text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="time"
                            value={newForm.breakOut}
                            onChange={(e) => setNewForm((f) => ({ ...f, breakOut: e.target.value }))}
                            className="rounded-[0.6rem] border border-slate-300 px-2 py-1.5 text-[0.95rem] text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="time"
                            value={newForm.checkOut}
                            onChange={(e) => setNewForm((f) => ({ ...f, checkOut: e.target.value }))}
                            className="rounded-[0.6rem] border border-slate-300 px-2 py-1.5 text-[0.95rem] text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-sm italic">
                          auto
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-sm italic">
                          auto
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleAddSubmit}
                              disabled={!newForm.memberName.trim()}
                              className="inline-flex h-9 items-center gap-1.5 rounded-[0.6rem] bg-emerald-600 px-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <Save className="size-3.5" />
                              Simpan
                            </button>
                            <button
                              type="button"
                              onClick={() => { setShowAddForm(false); setNewForm(EMPTY_FORM) }}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-[0.6rem] border border-slate-200 text-slate-500 transition hover:bg-slate-100"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : null}

                    {/* ── Data Rows ── */}
                    {paginatedRecords.length ? (
                      paginatedRecords.map((record) => {
                        const isEditing = editingId === record.id
                        const statusInfo = STATUS_MAP[record.status]

                        if (isEditing) {
                          return (
                            <tr key={record.id} className="border-t border-blue-200 bg-blue-50">
                              <td className="px-4 py-3">
                                <div className="h-5 w-5 rounded-md border border-slate-300 bg-white" />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={editForm.memberName}
                                  onChange={(e) => setEditForm((f) => ({ ...f, memberName: e.target.value }))}
                                  className="w-full rounded-[0.6rem] border border-slate-300 px-2 py-1.5 text-[0.95rem] text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={editForm.memberDepartment}
                                  onChange={(e) => setEditForm((f) => ({ ...f, memberDepartment: e.target.value }))}
                                  className="w-full rounded-[0.6rem] border border-slate-300 px-2 py-1.5 text-[0.95rem] text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="date"
                                  value={editForm.date}
                                  onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                                  className="rounded-[0.6rem] border border-slate-300 px-2 py-1.5 text-[0.95rem] text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="time"
                                  value={editForm.checkIn}
                                  onChange={(e) => setEditForm((f) => ({ ...f, checkIn: e.target.value }))}
                                  className="rounded-[0.6rem] border border-slate-300 px-2 py-1.5 text-[0.95rem] text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="time"
                                  value={editForm.breakIn}
                                  onChange={(e) => setEditForm((f) => ({ ...f, breakIn: e.target.value }))}
                                  className="rounded-[0.6rem] border border-slate-300 px-2 py-1.5 text-[0.95rem] text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="time"
                                  value={editForm.breakOut}
                                  onChange={(e) => setEditForm((f) => ({ ...f, breakOut: e.target.value }))}
                                  className="rounded-[0.6rem] border border-slate-300 px-2 py-1.5 text-[0.95rem] text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="time"
                                  value={editForm.checkOut}
                                  onChange={(e) => setEditForm((f) => ({ ...f, checkOut: e.target.value }))}
                                  className="rounded-[0.6rem] border border-slate-300 px-2 py-1.5 text-[0.95rem] text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3 text-slate-400 text-sm italic">auto</td>
                              <td className="px-4 py-3 text-slate-400 text-sm italic">auto</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEditSave(record.id)}
                                    className="inline-flex h-9 items-center gap-1.5 rounded-[0.6rem] bg-blue-600 px-3 text-sm font-medium text-white transition hover:bg-blue-700"
                                  >
                                    <Save className="size-3.5" />
                                    Simpan
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleEditCancel}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-[0.6rem] border border-slate-200 text-slate-500 transition hover:bg-slate-100"
                                  >
                                    <X className="size-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        }

                        return (
                          <tr
                            key={record.id}
                            className="border-t border-slate-200 transition hover:bg-slate-50"
                          >
                            <td className="px-4 py-5">
                              <div className="h-5 w-5 rounded-md border border-slate-300 bg-white" />
                            </td>
                            <td className="px-4 py-5">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-[0.9rem] font-medium text-slate-600">
                                  {record.memberName.slice(0, 1).toUpperCase()}
                                </div>
                                <span className="text-[1.05rem] font-medium text-slate-950">
                                  {record.memberName}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-5 text-[1.05rem] text-slate-500">
                              {record.memberDepartment}
                            </td>
                            <td className="px-4 py-5 text-[1.05rem] text-slate-500">
                              {new Intl.DateTimeFormat("en-US", {
                                month: "short",
                                day: "2-digit",
                                year: "numeric",
                                timeZone: "Asia/Jakarta",
                              }).format(new Date(`${record.date}T12:00:00+07:00`))}
                            </td>
                            <td className="px-4 py-5 text-[1.05rem] font-medium text-slate-950">
                              {record.checkIn ?? <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-4 py-5 text-[1.05rem] text-slate-500">
                              {record.breakIn ?? <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-4 py-5 text-[1.05rem] text-slate-500">
                              {record.breakOut ?? <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-4 py-5 text-[1.05rem] text-slate-500">
                              {record.checkOut ?? <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-4 py-5 text-[1.05rem] text-slate-500">
                              {record.workHours ?? <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-4 py-5">
                              <span
                                className={`rounded-full px-3 py-1 text-sm font-medium ${statusInfo.style}`}
                              >
                                {statusInfo.label}
                              </span>
                            </td>
                            <td className="px-4 py-5">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(record)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-blue-50 hover:text-blue-500"
                                  aria-label="Edit record"
                                >
                                  <Pencil className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecord(record.id)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                                  aria-label="Delete record"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={11}
                          className="h-64 px-4 py-8 text-center"
                        >
                          {records.length === 0 ? (
                            <div className="flex flex-col items-center gap-3">
                              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                                <CalendarDays className="size-7 text-slate-400" />
                              </div>
                              <p className="text-[1.15rem] font-medium text-slate-700">
                                Belum ada data yang tercatat
                              </p>
                              <p className="text-[1rem] text-slate-400">
                                Klik tombol &ldquo;Tambah Data&rdquo; untuk mulai mencatat absensi
                              </p>
                            </div>
                          ) : (
                            <p className="text-[1.1rem] italic text-slate-500">
                              Tidak ada data yang cocok dengan filter saat ini.
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-5">
              <p>
                Showing{" "}
                <span className="font-semibold text-slate-950">
                  {filteredRecords.length === 0 ? "0" : `${showFrom}-${showTo}`}
                </span>{" "}
                of <span className="font-semibold text-slate-950">{filteredRecords.length}</span> data
              </p>
              <div className="flex items-center gap-3">
                <span>Rows per page:</span>
                <div className="relative">
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="appearance-none rounded-[0.85rem] border border-slate-200 bg-white py-2 pl-4 pr-8 text-sm text-slate-950 outline-none"
                  >
                    {ROWS_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="inline-flex h-11 w-11 items-center justify-center rounded-[0.85rem] border border-slate-200 bg-white text-slate-500 disabled:opacity-50"
              >
                <ChevronLeft className="size-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => Math.abs(page - safePage) <= 2)
                .map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`inline-flex h-11 min-w-11 items-center justify-center rounded-[0.85rem] px-4 text-sm font-medium ${
                      page === safePage
                        ? "bg-black text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {page}
                  </button>
                ))}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="inline-flex h-11 w-11 items-center justify-center rounded-[0.85rem] border border-slate-200 bg-white text-slate-500 disabled:opacity-50"
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
