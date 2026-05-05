"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  CalendarDays,
  Check,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Minus,
  SquarePen,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  useSharedDashboardRange,
  sharedDateOptions,
  type SharedDashboardRange,
  type SharedDateOption,
} from "@/lib/shared-dashboard-range"
import {
  computeStatus,
  computeWorkHours,
  persistAttendanceRecords,
  type AttendanceRecordEntry,
  type AttendanceStatus,
} from "@/lib/attendance-records-store"
import {
  deleteAttendanceRecord,
  deleteAttendanceRecords,
  ensureDashboardSeed,
  fetchAttendanceRecords,
  insertAttendanceRecords,
  updateAttendanceRecord,
} from "@/lib/dashboard-data"
import { createClient } from "@/lib/supabase/client"

// --- Helper functions (tidak berubah) ---
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

function isInRange(record: AttendanceRecordEntry, selectedRange: SharedDashboardRange, now: Date): boolean {
  const recordDate = record.date
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  const toLocalDateString = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  switch (selectedRange) {
    case "Today":
      return recordDate === toLocalDateString(today)
    case "Yesterday": {
      const yest = new Date(today)
      yest.setDate(yest.getDate() - 1)
      return recordDate === toLocalDateString(yest)
    }
    case "This week": {
      const start = getStartOfWeek(today)
      const end = getEndOfWeek(today)
      const recordAsDate = new Date(`${recordDate}T00:00:00+07:00`)
      return recordAsDate >= start && recordAsDate <= end
    }
    case "This month": {
      const start = getStartOfMonth(today)
      const end = getEndOfMonth(today)
      const recordAsDate = new Date(`${recordDate}T00:00:00+07:00`)
      return recordAsDate >= start && recordAsDate <= end
    }
    case "This year": {
      const start = getStartOfYear(today.getFullYear())
      const end = getEndOfYear(today.getFullYear())
      const recordAsDate = new Date(`${recordDate}T00:00:00+07:00`)
      return recordAsDate >= start && recordAsDate <= end
    }
    case "Last year": {
      const start = getStartOfYear(today.getFullYear() - 1)
      const end = getEndOfYear(today.getFullYear() - 1)
      const recordAsDate = new Date(`${recordDate}T00:00:00+07:00`)
      return recordAsDate >= start && recordAsDate <= end
    }
    case "Last 7 days": {
      const start = new Date(today)
      start.setDate(start.getDate() - 6)
      const recordAsDate = new Date(`${recordDate}T00:00:00+07:00`)
      return recordAsDate >= start && recordAsDate <= today
    }
    case "Last 30 days": {
      const start = new Date(today)
      start.setDate(start.getDate() - 29)
      const recordAsDate = new Date(`${recordDate}T00:00:00+07:00`)
      return recordAsDate >= start && recordAsDate <= today
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
const ROWS_OPTIONS = [10, 25, 50] as const

type NewEntryForm = {
  memberName: string
  memberGroup: string
  date: string
  checkIn: string
  breakIn: string
  breakOut: string
  checkOut: string
}

const EMPTY_FORM: NewEntryForm = {
  memberName: "",
  memberGroup: "",
  date: new Date().toISOString().slice(0, 10),
  checkIn: "",
  breakIn: "",
  breakOut: "",
  checkOut: "",
}

export function AttendanceListOverview() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const { selectedRange, setSelectedRange } = useSharedDashboardRange("This week")
  const [currentTime, setCurrentTime] = React.useState(() => new Date())
  const [rowsPerPage, setRowsPerPage] = React.useState(10)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedStatus, setSelectedStatus] = React.useState<(typeof statusOptions)[number]>("All Status")
  const [selectedGroup, setSelectedGroup] = React.useState("All Groups")
  const [isDateOpen, setIsDateOpen] = React.useState(false)
  const [isStatusOpen, setIsStatusOpen] = React.useState(false)
  const [isGroupOpen, setIsGroupOpen] = React.useState(false)
  const [isOpeningEntry, setIsOpeningEntry] = React.useState(false)
  const [records, setRecords] = React.useState<AttendanceRecordEntry[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState("")
  const [showAddForm, setShowAddForm] = React.useState(false)
  const [newForm, setNewForm] = React.useState<NewEntryForm>(EMPTY_FORM)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editForm, setEditForm] = React.useState<NewEntryForm>(EMPTY_FORM)

  const [isRowsPerPageOpen, setIsRowsPerPageOpen] = React.useState(false)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = React.useState(false)

  const [sortColumn, setSortColumn] = React.useState<string>("date")
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("desc")

  const [alert, setAlert] = React.useState<{ type: "success" | "error"; message: string } | null>(null)

  const dateRef = React.useRef<HTMLDivElement | null>(null)
  const statusRef = React.useRef<HTMLDivElement | null>(null)
  const groupRef = React.useRef<HTMLDivElement | null>(null)
  const rowsPerPageRef = React.useRef<HTMLDivElement | null>(null)

  const dynamicGroupOptions = React.useMemo(() => {
    const groups = new Set<string>()
    const query = searchQuery.trim().toLowerCase()
    
    records.forEach((record) => {
      if (!isInRange(record, selectedRange, currentTime)) return
      if (selectedStatus !== "All Status" && record.status !== selectedStatus) return
      
      if (query && !record.memberName.toLowerCase().includes(query) && !record.memberGroup.toLowerCase().includes(query) && !record.date.includes(query)) return

      if (record.memberGroup) groups.add(record.memberGroup)
    })
    return ["All Groups", ...Array.from(groups).sort()]
  }, [records, selectedRange, selectedStatus, searchQuery, currentTime])

  // Load data
  React.useEffect(() => {
    let isMounted = true

    const load = async () => {
      try {
        await ensureDashboardSeed(supabase)
        const nextRecords = await fetchAttendanceRecords(supabase)
        if (isMounted) {
          setRecords(nextRecords)
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error instanceof Error ? error.message : "Failed to load attendance records.")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [supabase])

  // Live clock
  React.useEffect(() => {
    const id = window.setInterval(() => setCurrentTime(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  // Close dropdowns on outside click
  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (!dateRef.current?.contains(event.target as Node)) setIsDateOpen(false)
      if (!statusRef.current?.contains(event.target as Node)) setIsStatusOpen(false)
      if (!groupRef.current?.contains(event.target as Node)) setIsGroupOpen(false)
      if (!rowsPerPageRef.current?.contains(event.target as Node)) setIsRowsPerPageOpen(false)
    }
    window.addEventListener("mousedown", handlePointerDown)
    return () => window.removeEventListener("mousedown", handlePointerDown)
  }, [])

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [selectedRange, selectedStatus, selectedGroup, searchQuery])

  // Clear selection when page/filter changes
  React.useEffect(() => {
    setSelectedIds(new Set())
  }, [currentPage, selectedRange, selectedStatus, selectedGroup, searchQuery, rowsPerPage])

  const groupedOptions = sharedDateOptions.reduce<Record<string, SharedDateOption[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {})

  const pickerLabel = React.useMemo(() => getRangeLabel(selectedRange, currentTime), [selectedRange, currentTime])

  const filteredRecords = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    let result = records.filter((record) => {
      if (!isInRange(record, selectedRange, currentTime)) return false
      if (selectedStatus !== "All Status" && record.status !== selectedStatus) return false
      if (selectedGroup !== "All Groups" && record.memberGroup !== selectedGroup) return false
      if (query && !record.memberName.toLowerCase().includes(query) && !record.memberGroup.toLowerCase().includes(query) && !record.date.includes(query)) return false
      return true
    })

    result.sort((a, b) => {
      let valA: any = a[sortColumn as keyof typeof a]
      let valB: any = b[sortColumn as keyof typeof b]

      if (typeof valA === "string") valA = valA.toLowerCase()
      if (typeof valB === "string") valB = valB.toLowerCase()

      if (valA < valB) return sortDirection === "asc" ? -1 : 1
      if (valA > valB) return sortDirection === "asc" ? 1 : -1
      return 0
    })

    return result
  }, [records, selectedRange, selectedStatus, selectedGroup, searchQuery, currentTime, sortColumn, sortDirection])

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

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / rowsPerPage))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedRecords = filteredRecords.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage)
  const showFrom = filteredRecords.length === 0 ? 0 : (safePage - 1) * rowsPerPage + 1
  const showTo = Math.min(safePage * rowsPerPage, filteredRecords.length)

  // Checkbox handlers
  const handleSelectAll = () => {
    if (selectedIds.size === paginatedRecords.length) {
      setSelectedIds(new Set())
    } else {
      const newSet = new Set(selectedIds)
      paginatedRecords.forEach(r => newSet.add(r.id))
      setSelectedIds(newSet)
    }
  }

  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedIds(newSet)
  }

  const isAllSelected = paginatedRecords.length > 0 && paginatedRecords.every(r => selectedIds.has(r.id))
  const isIndeterminate = paginatedRecords.some(r => selectedIds.has(r.id)) && !isAllSelected

  const handleOpenEntry = async () => {
    setIsOpeningEntry(true)
    try {
      const response = await fetch("/api/navigation/attendance-add-access", { method: "POST" })
      if (!response.ok) {
        setAlert({ type: "error", message: "Failed to get access to entry page." })
        setTimeout(() => setAlert(null), 3000)
        return
      }
      router.push("/dashboard/attendance/add")
      router.refresh()
    } catch (error) {
      setAlert({ type: "error", message: "An error occurred during navigation." })
      setTimeout(() => setAlert(null), 3000)
    } finally {
      setIsOpeningEntry(false)
    }
  }

  const handleDeleteRecord = (id: string) => {
    void (async () => {
      const previous = records
      const updated = records.filter(r => r.id !== id)
      setRecords(updated)
      setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next })

      try {
        await deleteAttendanceRecord(supabase, id)
        setAlert({ type: "success", message: "Attendance record deleted successfully." })
        setTimeout(() => setAlert(null), 3000)
      } catch {
        setRecords(previous)
        setAlert({ type: "error", message: "Failed to delete attendance record." })
        setTimeout(() => setAlert(null), 3000)
      }
    })()
  }

  const handleBulkDelete = () => {
    void (async () => {
      if (selectedIds.size === 0) return
      const previous = records
      const ids = Array.from(selectedIds)
      const updated = records.filter(r => !selectedIds.has(r.id))
      setRecords(updated)
      setSelectedIds(new Set())
      setShowBulkDeleteDialog(false)

      try {
        await deleteAttendanceRecords(supabase, ids)
        setAlert({ type: "success", message: `${ids.length} attendance record(s) deleted successfully.` })
        setTimeout(() => setAlert(null), 3000)
      } catch {
        setRecords(previous)
        setAlert({ type: "error", message: "Failed to delete attendance records." })
        setTimeout(() => setAlert(null), 3000)
      }
    })()
  }

  const handleReset = () => {
    setSearchQuery("")
    setSelectedStatus("All Status")
    setSelectedGroup("All Groups")
  }

  const handleAddSubmit = () => {
    if (!newForm.memberName.trim() || !newForm.date) return
    const checkIn = newForm.checkIn || null
    const checkOut = newForm.checkOut || null
    const record: AttendanceRecordEntry = {
      id: `rec_${Date.now()}`,
      memberId: `manual_${Date.now()}`,
      memberName: newForm.memberName.trim(),
      memberGroup: newForm.memberGroup.trim() || "—",
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
    setAlert({ type: "success", message: "Attendance record added successfully." })
    setTimeout(() => setAlert(null), 3000)
  }

  const handleStartEdit = (record: AttendanceRecordEntry) => {
    setEditingId(record.id)
    setEditForm({
      memberName: record.memberName,
      memberGroup: record.memberGroup,
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
    const updated = records.map(r => {
      if (r.id !== id) return r
      return {
        ...r,
        memberName: editForm.memberName.trim() || r.memberName,
        memberGroup: editForm.memberGroup.trim() || r.memberGroup,
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
    setAlert({ type: "success", message: "Attendance record updated successfully." })
    setTimeout(() => setAlert(null), 3000)
  }

  const handleEditCancel = () => setEditingId(null)

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 sm:p-6">
        <div className="space-y-6">
          {alert && (
            <Alert className={`max-w-md ${alert.type === "success" ? "" : "border-red-200 bg-red-50"}`}>
              {alert.type === "success" ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
              <AlertTitle>{alert.type === "success" ? "Success" : "Error"}</AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          )}

          {/* --- HEADER: Judul Halaman --- */}
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2.15rem]">Attendance list</h1>

          {/* --- FILTER BAR: Pencarian, Filter Tanggal, Status, dan Grup --- */}
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
            <div className="flex min-w-0 flex-1 items-center rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3">
              <Search className="size-5 text-slate-400" />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name, group, date..." className="min-w-0 flex-1 bg-transparent px-3 text-[1.05rem] outline-hidden placeholder:text-slate-400" />
            </div>

            <div className="flex flex-wrap gap-3">
              {/* Date dropdown */}
              <div ref={dateRef} className="relative">
                <button type="button" onClick={() => setIsDateOpen(v => !v)} className="flex min-w-[18rem] items-center justify-between gap-3 rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3 text-[1.05rem] text-slate-950">
                  <div className="flex items-center gap-3"><CalendarDays className="size-5 text-slate-500" /><span>{pickerLabel}</span></div>
                  <ChevronDown className="size-4 text-slate-400" />
                </button>
                {isDateOpen && (
                  <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-[19rem] overflow-hidden rounded-[1rem] border border-slate-200 bg-white shadow-xl">
                    {Object.entries(groupedOptions).map(([group, items], idx) => (
                      <div key={group} className={idx ? "border-t border-slate-200" : ""}>
                        <div className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-500"><CalendarDays className="size-4" />{group}</div>
                        <div className="pb-2">
                          {items.map(item => (
                            <button key={item.label} onClick={() => { setSelectedRange(item.label); setIsDateOpen(false) }} className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-[1.05rem] ${selectedRange === item.label ? "bg-slate-100 text-slate-950" : "text-slate-900 hover:bg-slate-50"}`}>
                              <span>{item.label}</span>
                              <Check className={`size-4 ${selectedRange === item.label ? "opacity-100" : "opacity-0"}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status dropdown */}
              <div ref={statusRef} className="relative">
                <button type="button" onClick={() => setIsStatusOpen(v => !v)} className="flex min-w-[10.5rem] items-center justify-between gap-3 rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3 text-[1.05rem] text-slate-950">
                  <span>{selectedStatus}</span>
                  <ChevronDown className="size-4 text-slate-400" />
                </button>
                {isStatusOpen && (
                  <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-[11rem] overflow-hidden rounded-[1rem] border border-slate-200 bg-white p-2 shadow-xl">
                    {statusOptions.map(opt => (
                      <button key={opt} onClick={() => { setSelectedStatus(opt); setIsStatusOpen(false) }} className={`flex w-full items-center justify-between rounded-[0.7rem] px-4 py-3 text-left text-[1.05rem] ${selectedStatus === opt ? "bg-slate-100 text-slate-950" : "text-slate-900 hover:bg-slate-50"}`}>
                        <span>{opt}</span>
                        <Check className={`size-4 ${selectedStatus === opt ? "opacity-100" : "opacity-0"}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Group dropdown */}
              <div ref={groupRef} className="relative">
                <button type="button" onClick={() => setIsGroupOpen(v => !v)} className="flex min-w-[12.5rem] items-center justify-between gap-3 rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3 text-[1.05rem] text-slate-950">
                  <span>{selectedGroup}</span>
                  <ChevronDown className="size-4 text-slate-400" />
                </button>
                {isGroupOpen && (
                  <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-[12.5rem] overflow-hidden rounded-[1rem] border border-slate-200 bg-white p-2 shadow-xl">
                    {dynamicGroupOptions.map(opt => (
                      <button key={opt} onClick={() => { setSelectedGroup(opt); setIsGroupOpen(false) }} className={`flex w-full items-center justify-between rounded-[0.7rem] px-4 py-3 text-left text-[1.05rem] ${selectedGroup === opt ? "bg-slate-100 text-slate-950" : "text-slate-900 hover:bg-slate-50"}`}>
                        <span>{opt}</span>
                        <Check className={`size-4 ${selectedGroup === opt ? "opacity-100" : "opacity-0"}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* --- ACTION BUTTONS: Tombol Reset, Import, Delete Massal, dan Entry --- */}
              <button onClick={handleReset} className="inline-flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-[0.95rem] bg-black text-white" aria-label="Reset filters"><RotateCcw className="size-5" /></button>
              <button className="inline-flex items-center gap-3 rounded-[0.95rem] border border-slate-200 bg-white px-5 py-3 text-[1.05rem] font-medium text-slate-950"><Download className="size-5" />Import</button>

              {selectedIds.size > 0 && (
                <button onClick={() => setShowBulkDeleteDialog(true)} className="inline-flex items-center gap-2 rounded-[0.95rem] border border-red-200 bg-red-50 px-5 py-3 text-[1.05rem] font-medium text-red-700 hover:bg-red-100"><Trash2 className="size-5" />Delete ({selectedIds.size})</button>
              )}

              <button onClick={handleOpenEntry} disabled={isOpeningEntry} className="inline-flex items-center gap-3 rounded-[0.95rem] bg-black px-5 py-3 text-[1.05rem] font-medium text-white disabled:opacity-70"><Plus className="size-5" />{isOpeningEntry ? "Opening..." : "Entry"}</button>
            </div>
          </div>

          {/* --- TABEL DATA: Kontainer utama untuk daftar record absensi --- */}
          <div className="rounded-[1rem] border border-slate-200 bg-white">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center gap-3 text-slate-500"><Loader2 className="size-6 animate-spin text-slate-400" /><span>Memuat data absensi...</span></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[92rem] border-collapse">
                  <thead className="rounded-t-[1rem]">
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-left text-xs uppercase tracking-[0.12em] text-slate-500 rounded-t-[1rem]">
                      <th className="w-16 px-4 py-5">
                        <button onClick={handleSelectAll} className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-slate-400 bg-white transition hover:border-slate-600">
                          {isAllSelected ? <Check className="size-3.5 text-slate-700" /> : isIndeterminate ? <Minus className="size-3.5 text-slate-700" /> : null}
                        </button>
                      </th>
                      <th className="px-4 py-5">
                        <button onClick={() => handleSort('memberName')} className="flex items-center gap-2 hover:text-slate-900 transition">
                          Member {renderSortIcon('memberName')}
                        </button>
                      </th>
                      <th className="px-4 py-5">
                        <button onClick={() => handleSort('memberGroup')} className="flex items-center gap-2 hover:text-slate-900 transition">
                          Group {renderSortIcon('memberGroup')}
                        </button>
                      </th>
                      <th className="px-4 py-5">
                        <button onClick={() => handleSort('date')} className="flex items-center gap-2 hover:text-slate-900 transition">
                          Date {renderSortIcon('date')}
                        </button>
                      </th>
                      <th className="px-4 py-5">
                        <button onClick={() => handleSort('checkIn')} className="flex items-center gap-2 hover:text-slate-900 transition">
                          Check In {renderSortIcon('checkIn')}
                        </button>
                      </th>
                      <th className="px-4 py-5">
                        <button onClick={() => handleSort('breakIn')} className="flex items-center gap-2 hover:text-slate-900 transition">
                          Break In {renderSortIcon('breakIn')}
                        </button>
                      </th>
                      <th className="px-4 py-5">
                        <button onClick={() => handleSort('breakOut')} className="flex items-center gap-2 hover:text-slate-900 transition">
                          Break Out {renderSortIcon('breakOut')}
                        </button>
                      </th>
                      <th className="px-4 py-5">
                        <button onClick={() => handleSort('checkOut')} className="flex items-center gap-2 hover:text-slate-900 transition">
                          Check Out {renderSortIcon('checkOut')}
                        </button>
                      </th>
                      <th className="px-4 py-5">
                        <button onClick={() => handleSort('workHours')} className="flex items-center gap-2 hover:text-slate-900 transition">
                          Work Hours {renderSortIcon('workHours')}
                        </button>
                      </th>
                      <th className="px-4 py-5">
                        <button onClick={() => handleSort('status')} className="flex items-center gap-2 hover:text-slate-900 transition">
                          Status {renderSortIcon('status')}
                        </button>
                      </th>
                      <th className="px-4 py-5">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {showAddForm && (
                      <tr className="border-t border-emerald-200 bg-emerald-50">
                        <td className="px-4 py-3"><div className="h-5 w-5 rounded-md border border-slate-300 bg-white" /></td>
                        <td className="px-4 py-3"><input type="text" placeholder="Nama member" value={newForm.memberName} onChange={e => setNewForm(f => ({ ...f, memberName: e.target.value }))} className="w-full rounded-[0.6rem] border border-slate-300 px-2 py-1.5 text-[0.95rem] outline-none focus:border-emerald-500" /></td>
                        <td className="px-4 py-3"><input type="text" placeholder="Group" value={newForm.memberGroup} onChange={e => setNewForm(f => ({ ...f, memberGroup: e.target.value }))} className="w-full rounded-[0.6rem] border border-slate-300 px-2 py-1.5 text-[0.95rem] outline-none focus:border-emerald-500" /></td>
                        <td className="px-4 py-3"><input type="date" value={newForm.date} onChange={e => setNewForm(f => ({ ...f, date: e.target.value }))} className="rounded-[0.6rem] border border-slate-300 px-2 py-1.5 text-[0.95rem] outline-none focus:border-emerald-500" /></td>
                        <td className="px-4 py-3"><input type="time" value={newForm.checkIn} onChange={e => setNewForm(f => ({ ...f, checkIn: e.target.value }))} className="rounded-[0.6rem] border border-slate-300 px-2 py-1.5 text-[0.95rem] outline-none focus:border-emerald-500" /></td>
                        <td className="px-4 py-3"><input type="time" value={newForm.breakIn} onChange={e => setNewForm(f => ({ ...f, breakIn: e.target.value }))} className="rounded-[0.6rem] border border-slate-300 px-2 py-1.5 text-[0.95rem] outline-none focus:border-emerald-500" /></td>
                        <td className="px-4 py-3"><input type="time" value={newForm.breakOut} onChange={e => setNewForm(f => ({ ...f, breakOut: e.target.value }))} className="rounded-[0.6rem] border border-slate-300 px-2 py-1.5 text-[0.95rem] outline-none focus:border-emerald-500" /></td>
                        <td className="px-4 py-3"><input type="time" value={newForm.checkOut} onChange={e => setNewForm(f => ({ ...f, checkOut: e.target.value }))} className="rounded-[0.6rem] border border-slate-300 px-2 py-1.5 text-[0.95rem] outline-none focus:border-emerald-500" /></td>
                        <td className="px-4 py-3 text-sm italic text-slate-400">auto</td>
                        <td className="px-4 py-3 text-sm italic text-slate-400">auto</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={handleAddSubmit} disabled={!newForm.memberName.trim()} className="inline-flex h-9 items-center gap-1.5 rounded-[0.6rem] bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"><Save className="size-3.5" />Simpan</button>
                            <button onClick={() => { setShowAddForm(false); setNewForm(EMPTY_FORM) }} className="inline-flex h-9 w-9 items-center justify-center rounded-[0.6rem] border border-slate-200 text-slate-500 hover:bg-slate-100"><X className="size-4" /></button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {paginatedRecords.length ? paginatedRecords.map(record => {
                      const isEditing = editingId === record.id
                      const statusInfo = STATUS_MAP[record.status]
                      if (isEditing) {
                        return (
                          <tr key={record.id} className="border-t border-blue-200 bg-blue-50">
                            <td className="px-4 py-3"><div className="h-5 w-5 rounded-md border border-slate-300 bg-white" /></td>
                            <td className="px-4 py-3"><input type="text" value={editForm.memberName} onChange={e => setEditForm(f => ({ ...f, memberName: e.target.value }))} className="w-full rounded-[0.6rem] border border-slate-300 px-2 py-1.5 text-[0.95rem] outline-none focus:border-blue-500" /></td>
                            <td className="px-4 py-3"><input type="text" value={editForm.memberGroup} onChange={e => setEditForm(f => ({ ...f, memberGroup: e.target.value }))} className="w-full rounded-[0.6rem] border border-slate-300 px-2 py-1.5 text-[0.95rem] outline-none focus:border-blue-500" /></td>
                            <td className="px-4 py-3"><input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} className="rounded-[0.6rem] border border-slate-300 px-2 py-1.5 text-[0.95rem] outline-none focus:border-blue-500" /></td>
                            <td className="px-4 py-3"><input type="time" value={editForm.checkIn} onChange={e => setEditForm(f => ({ ...f, checkIn: e.target.value }))} className="rounded-[0.6rem] border border-slate-300 px-2 py-1.5 text-[0.95rem] outline-none focus:border-blue-500" /></td>
                            <td className="px-4 py-3"><input type="time" value={editForm.breakIn} onChange={e => setEditForm(f => ({ ...f, breakIn: e.target.value }))} className="rounded-[0.6rem] border border-slate-300 px-2 py-1.5 text-[0.95rem] outline-none focus:border-blue-500" /></td>
                            <td className="px-4 py-3"><input type="time" value={editForm.breakOut} onChange={e => setEditForm(f => ({ ...f, breakOut: e.target.value }))} className="rounded-[0.6rem] border border-slate-300 px-2 py-1.5 text-[0.95rem] outline-none focus:border-blue-500" /></td>
                            <td className="px-4 py-3"><input type="time" value={editForm.checkOut} onChange={e => setEditForm(f => ({ ...f, checkOut: e.target.value }))} className="rounded-[0.6rem] border border-slate-300 px-2 py-1.5 text-[0.95rem] outline-none focus:border-blue-500" /></td>
                            <td className="px-4 py-3 text-sm italic text-slate-400">auto</td>
                            <td className="px-4 py-3 text-sm italic text-slate-400">auto</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button onClick={() => handleEditSave(record.id)} className="inline-flex h-9 items-center gap-1.5 rounded-[0.6rem] bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"><Save className="size-3.5" />Simpan</button>
                                <button onClick={handleEditCancel} className="inline-flex h-9 w-9 items-center justify-center rounded-[0.6rem] border border-slate-200 text-slate-500 hover:bg-slate-100"><X className="size-4" /></button>
                              </div>
                            </td>
                          </tr>
                        )
                      }
                      const isSelected = selectedIds.has(record.id)
                      return (
                        <tr key={record.id} className="border-b border-slate-100 last:border-0 text-slate-700">
                          <td className="px-4 py-5">
                            <button onClick={() => handleToggleSelect(record.id)} className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-slate-300 bg-white transition hover:border-slate-500">
                              {isSelected && <Check className="size-3.5 text-slate-700" />}
                            </button>
                          </td>
                          <td className="px-4 py-5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-[0.9rem] font-medium text-slate-600">{record.memberName.slice(0,1).toUpperCase()}</div>
                              <span className="text-[1.05rem] font-medium text-slate-950">{record.memberName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-5 text-[1.05rem] text-slate-500">{record.memberGroup}</td>
                          <td className="px-4 py-5 text-[1.05rem] text-slate-500">{new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date(`${record.date}T12:00:00+07:00`))}</td>
                          <td className="px-4 py-5 text-[1.05rem] font-medium text-slate-950">{record.checkIn ?? <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-5 text-[1.05rem] text-slate-500">{record.breakIn ?? <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-5 text-[1.05rem] text-slate-500">{record.breakOut ?? <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-5 text-[1.05rem] text-slate-500">{record.checkOut ?? <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-5 text-[1.05rem] text-slate-500">{record.workHours ?? <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-5"><span className={`rounded-full px-3 py-1 text-sm font-medium ${statusInfo.style}`}>{statusInfo.label}</span></td>
                          <td className="px-4 py-5">
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleStartEdit(record)} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-blue-50 hover:text-blue-500"><SquarePen className="size-4" /></button>
                              <button onClick={() => handleDeleteRecord(record.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-red-50 hover:text-red-500"><Trash2 className="size-4" /></button>
                            </div>
                          </td>
                        </tr>
                      )
                    }) : (
                      <tr><td colSpan={11} className="h-64 px-4 py-8 text-center">{records.length === 0 ? (<div className="flex flex-col items-center gap-3"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100"><CalendarDays className="size-7 text-slate-400" /></div><p className="text-[1.15rem] font-medium text-slate-700">Belum ada data yang tercatat</p><p className="text-[1rem] text-slate-400">Klik tombol &ldquo;Tambah Data&rdquo; untuk mulai mencatat absensi</p></div>) : (<p className="text-[1.1rem] italic text-slate-500">Tidak ada data yang cocok dengan filter saat ini.</p>)}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* --- PAGINATION: Kontrol perpindahan halaman dan jumlah baris --- */}
          <div className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between rounded-b-[1rem] bg-white">
            <div className="flex flex-wrap items-center gap-5">
              <p>Showing <span className="font-semibold text-slate-950">{filteredRecords.length === 0 ? "0" : `${showFrom}-${showTo}`}</span> of <span className="font-semibold text-slate-950">{filteredRecords.length}</span> data</p>
              <div className="flex items-center gap-3">
                <span className="text-slate-500">Rows per page:</span>
                <div className="relative" ref={rowsPerPageRef}>
                  <button
                    onClick={() => setIsRowsPerPageOpen(!isRowsPerPageOpen)}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                  >
                    <span>{rowsPerPage}</span>
                    <ChevronDown className={`size-4 text-slate-400 transition-transform ${isRowsPerPageOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isRowsPerPageOpen && (
                    <div className="absolute top-full left-0 z-50 mt-1 w-24 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                      {ROWS_OPTIONS.map((n) => (
                        <button
                          key={n}
                          onClick={() => {
                            setRowsPerPage(n)
                            setCurrentPage(1)
                            setIsRowsPerPageOpen(false)
                          }}
                          className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition ${
                            rowsPerPage === n ? "bg-slate-50 text-black font-semibold" : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <span>{n}</span>
                          {rowsPerPage === n && <Check className="size-3.5 text-black" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={safePage <= 1} className="inline-flex h-11 w-11 items-center justify-center rounded-[0.85rem] border border-slate-200 bg-white text-slate-500 disabled:opacity-50"><ChevronLeft className="size-4" /></button>
              {Array.from({ length: totalPages }, (_, i) => i+1).filter(page => Math.abs(page - safePage) <= 2).map(page => (
                <button key={page} onClick={() => setCurrentPage(page)} className={`inline-flex h-11 min-w-11 items-center justify-center rounded-[0.85rem] px-4 text-sm font-medium ${page === safePage ? "bg-black text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{page}</button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={safePage >= totalPages} className="inline-flex h-11 w-11 items-center justify-center rounded-[0.85rem] border border-slate-200 bg-white text-slate-500 disabled:opacity-50"><ChevronRight className="size-4" /></button>
            </div>
          </div>
        </div>
      </section>

      {/* Bulk Delete Dialog */}
      {showBulkDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-900">Confirm Deletion</h3>
            <p className="mt-2 text-slate-600">Are you sure you want to delete {selectedIds.size} selected record{selectedIds.size > 1 ? 's' : ''}? This action cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowBulkDeleteDialog(false)} className="rounded-lg px-4 py-2 text-slate-600 hover:bg-slate-100">Cancel</button>
              <button onClick={handleBulkDelete} className="rounded-lg bg-red-600 px-6 py-2 font-medium text-white hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
