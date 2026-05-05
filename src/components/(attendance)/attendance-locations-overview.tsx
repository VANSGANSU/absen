"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Check,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleX,
  Eye,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  UsersRound,
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
  type AttendanceLocationRecord,
} from "@/lib/locations-store"
import {
  ensureDashboardSeed,
  fetchLocations,
  updateLocationStatus,
} from "@/lib/dashboard-data"
import { createClient } from "@/lib/supabase/client"

const ROWS_OPTIONS = ["10", "25", "50"] as const

export function AttendanceLocationsOverview() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const [locations, setLocations] = React.useState<AttendanceLocationRecord[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [rowsPerPage, setRowsPerPage] = React.useState<(typeof ROWS_OPTIONS)[number]>("10")
  const [isRowsPerPageOpen, setIsRowsPerPageOpen] = React.useState(false)
  const rowsPerPageRef = React.useRef<HTMLDivElement | null>(null)
  const [isOpeningAdd, setIsOpeningAdd] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [viewingLocation, setViewingLocation] = React.useState<AttendanceLocationRecord | null>(null)
  const [currentPage, setCurrentPage] = React.useState(1)

  // Sort state
  const [sortColumn, setSortColumn] = React.useState<string>("name")
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc")
  const [alert, setAlert] = React.useState<{ type: "success" | "error"; message: string } | null>(null)

  React.useEffect(() => {
    let isMounted = true

    const load = async () => {
      try {
        await ensureDashboardSeed(supabase)
        const nextLocations = await fetchLocations(supabase)
        if (isMounted) setLocations(nextLocations)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void load()

    const handlePointerDown = (event: MouseEvent) => {
      if (!rowsPerPageRef.current?.contains(event.target as Node)) setIsRowsPerPageOpen(false)
    }
    window.addEventListener("mousedown", handlePointerDown)

    return () => {
      isMounted = false
      window.removeEventListener("mousedown", handlePointerDown)
    }
  }, [supabase])

  const filteredLocations = React.useMemo(() => {
    let result = locations.filter((item) => {
      const query = searchQuery.trim().toLowerCase()
      return (
        item.name.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      )
    })

    result.sort((a, b) => {
      let valA: any = a[sortColumn as keyof typeof a]
      let valB: any = b[sortColumn as keyof typeof b]

      if (sortColumn === "active") {
        valA = a.active ? 1 : 0
        valB = b.active ? 1 : 0
      }

      if (typeof valA === "string") valA = valA.toLowerCase()
      if (typeof valB === "string") valB = valB.toLowerCase()

      if (valA < valB) return sortDirection === "asc" ? -1 : 1
      if (valA > valB) return sortDirection === "asc" ? 1 : -1
      return 0
    })

    return result
  }, [locations, searchQuery, sortColumn, sortDirection])

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

  const rowsNum = parseInt(rowsPerPage, 10)
  const totalPages = Math.max(1, Math.ceil(filteredLocations.length / rowsNum))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedLocations = filteredLocations.slice((safePage - 1) * rowsNum, safePage * rowsNum)

  // Reset ke halaman 1 kalau search berubah
  React.useEffect(() => { setCurrentPage(1) }, [searchQuery, rowsPerPage])

  const activeLocations = locations.filter((item) => item.active).length

  const handleToggleStatus = (id: string) => {
    const currentItem = locations.find((item) => item.id === id)
    if (!currentItem) return
    const nextActive = !currentItem.active
    setLocations((current) =>
      current.map((item) => (item.id === id ? { ...item, active: nextActive } : item))
    )
    void updateLocationStatus(supabase, id, nextActive)
      .then(() => {
        const msg = nextActive
          ? `Location "${currentItem.name}" activated successfully.`
          : `Location "${currentItem.name}" deactivated successfully.`
        setAlert({ type: "success", message: msg })
        setTimeout(() => setAlert(null), 3000)
      })
      .catch(() => {
        // Rollback optimistic update
        setLocations((current) =>
          current.map((item) => (item.id === id ? { ...item, active: currentItem.active } : item))
        )
        setAlert({ type: "error", message: "Failed to update location status. Please try again." })
        setTimeout(() => setAlert(null), 3000)
      })
  }

  const handleOpenAdd = async () => {
    setIsOpeningAdd(true)
    try {
      const response = await fetch("/api/navigation/location-add-access", { method: "POST" })
      if (!response.ok) return
      router.push("/dashboard/attendance/locations/add")
      router.refresh()
    } finally {
      setIsOpeningAdd(false)
    }
  }

  const handleEdit = (id: string) => {
    router.push(`/dashboard/attendance/locations/edit/${id}`)
  }

  const summaryCards = [
    { label: "Total Locations",    value: locations.length,                  icon: MapPin,        tone: "text-slate-950"  },
    { label: "Active Locations",   value: activeLocations,                   icon: CheckCircle2,  tone: "text-emerald-500"},
    { label: "Inactive Locations", value: locations.length - activeLocations, icon: CircleX,      tone: "text-red-500"    },
    { label: "Registered Users",   value: 0,                                 icon: UsersRound,    tone: "text-blue-500"   },
  ]

  return (
    <div className="space-y-6">
      {alert && (
        <Alert className={`max-w-md ${alert.type === "error" ? "border-red-200 bg-red-50" : ""}`}>
          {alert.type === "success" ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
          <AlertTitle>{alert.type === "success" ? "Success" : "Error"}</AlertTitle>
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      )}

      <section className="relative rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">

        {/* ── Loading overlay ── */}
        {isLoading && (
          <div className="absolute inset-0 z-40 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="size-9 animate-spin text-slate-400" />
              <p className="text-sm font-medium text-slate-500">Refreshing...</p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-500 sm:text-4xl">
            Location
          </h1>

          {/* ── Summary cards ──
              • xs  : 1 column
              • sm  : 2 columns
              • xl  : 4 columns
          */}
          <div className="grid grid-cols-1 gap-0 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4">
            {summaryCards.map((card, index) => (
              <div
                key={card.label}
                className={`flex items-center gap-4 px-6 py-6 sm:px-5 sm:py-7
                  ${index !== 0 ? "sm:border-l sm:border-slate-200" : ""}
                  ${index >= 2 ? "sm:border-t sm:border-slate-200 xl:border-t-0" : ""}
                `}
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 ${card.tone}`}>
                  <card.icon className="size-6" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-sm text-slate-500 sm:text-base">{card.label}</p>
                  <p className="mt-0.5 text-3xl font-semibold tracking-tight text-slate-950">
                    {card.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* ── List header + controls ──
              • xs  : stacked column
              • sm  : search full-width, row of buttons
              • xl  : title left / controls right on one row
          */}
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Locations List
            </h2>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Search */}
              <div className="flex w-full items-center rounded-[0.95rem] border border-slate-200 bg-white px-4 py-2.5 sm:w-72 lg:w-80">
                <Search className="size-4 shrink-0 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, code…"
                  className="ml-2 min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="ml-1 text-slate-400 hover:text-slate-600">
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Refresh */}
                <button
                  type="button"
                  onClick={() => {
                    setIsLoading(true)
                    void ensureDashboardSeed(supabase).then(() =>
                      fetchLocations(supabase).then((next) => {
                        setLocations(next)
                        setIsLoading(false)
                      })
                    )
                  }}
                  disabled={isLoading}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.95rem] border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
                </button>

                {/* Add */}
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  disabled={isOpeningAdd}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-[0.95rem] bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-70 sm:flex-none"
                >
                  <Plus className="size-4 shrink-0" />
                  {isOpeningAdd ? "Opening…" : "Add"}
                </button>
              </div>
            </div>
          </div>

          {/* ── TABLE — horizontal scroll on all screen sizes ── */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 -mx-4 sm:mx-0">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-widest text-slate-400">
                  <th className="px-4 py-3 w-[18%]">
                    <button onClick={() => handleSort('name')} className="flex items-center gap-2 hover:text-slate-900 transition">
                      Location Name {renderSortIcon('name')}
                    </button>
                  </th>
                  <th className="px-4 py-3 w-[10%]">
                    <button onClick={() => handleSort('code')} className="flex items-center gap-2 hover:text-slate-900 transition">
                      Code {renderSortIcon('code')}
                    </button>
                  </th>
                  <th className="px-4 py-3 w-[20%]">
                    <button onClick={() => handleSort('description')} className="flex items-center gap-2 hover:text-slate-900 transition">
                      Description {renderSortIcon('description')}
                    </button>
                  </th>
                  <th className="px-4 py-3 w-[16%]">
                    <button onClick={() => handleSort('latitude')} className="flex items-center gap-2 hover:text-slate-900 transition">
                      Coordinates {renderSortIcon('latitude')}
                    </button>
                  </th>
                  <th className="px-4 py-3 w-[8%]">
                    <button onClick={() => handleSort('radius')} className="flex items-center gap-2 hover:text-slate-900 transition">
                      Radius {renderSortIcon('radius')}
                    </button>
                  </th>
                  <th className="px-4 py-3 w-[8%]">
                    <button onClick={() => handleSort('type')} className="flex items-center gap-2 hover:text-slate-900 transition">
                      Type {renderSortIcon('type')}
                    </button>
                  </th>
                  <th className="px-4 py-3 w-[12%]">
                    <button onClick={() => handleSort('active')} className="flex items-center gap-2 hover:text-slate-900 transition">
                      Status {renderSortIcon('active')}
                    </button>
                  </th>
                  <th className="px-4 py-3 w-[8%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLocations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No locations found.
                    </td>
                  </tr>
                ) : (
                  paginatedLocations.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-slate-900 truncate max-w-0">
                        <span className="block truncate">{item.name}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                          {item.code}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 truncate max-w-0">
                        <span className="block truncate">{item.description}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 tabular-nums text-xs">
                        {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">{item.radius}m</td>
                      <td className="px-4 py-3.5">
                        <span className="rounded-full border border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {item.type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => handleToggleStatus(item.id)}
                          className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 transition hover:bg-slate-200"
                        >
                          <span className={`relative h-4 w-7 rounded-full transition-colors ${item.active ? "bg-emerald-500" : "bg-slate-300"}`}>
                            <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${item.active ? "left-3.5" : "left-0.5"}`} />
                          </span>
                          <span className={`text-xs font-medium ${item.active ? "text-emerald-600" : "text-slate-500"}`}>
                            {item.active ? "Active" : "Inactive"}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewingLocation(item)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                          >
                            <Eye className="size-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(item.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                          >
                            <Pencil className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          <div className="flex flex-col gap-4 border-t border-slate-200 pt-4 text-sm text-slate-600 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            {/* Left: showing info + rows per page */}
            <div className="flex flex-wrap items-center gap-4">
              <p className="text-sm text-slate-600">
                Showing{" "}
                <span className="font-semibold text-slate-950">
                  {filteredLocations.length === 0
                    ? "0"
                    : `${(safePage - 1) * rowsNum + 1}–${Math.min(safePage * rowsNum, filteredLocations.length)}`}
                </span>{" "}
                of <span className="font-semibold text-slate-950">{filteredLocations.length}</span>
              </p>

              <div className="flex items-center gap-2" ref={rowsPerPageRef}>
                <span className="text-slate-500 text-sm">Rows:</span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsRowsPerPageOpen(!isRowsPerPageOpen)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50 transition"
                  >
                    {rowsPerPage}
                    <ChevronDown className={`size-3.5 text-slate-400 transition-transform ${isRowsPerPageOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isRowsPerPageOpen && (
                    <div className="absolute top-full left-0 z-50 mb-1 w-20 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                      {ROWS_OPTIONS.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => { setRowsPerPage(n); setIsRowsPerPageOpen(false) }}
                          className={`flex w-full items-center justify-between px-3 py-2 text-sm transition ${
                            rowsPerPage === n ? "bg-slate-50 font-semibold text-black" : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {n}
                          {rowsPerPage === n && <Check className="size-3 text-black" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: page buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="size-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition ${
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
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── VIEW MODAL ──
          • xs / sm  : full-screen sheet (rounded top corners only, anchored to bottom)
          • md+       : centered dialog with max-w-2xl
      */}
      {viewingLocation && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setViewingLocation(null) }}
        >
          <div className="w-full max-h-[90dvh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl">
            {/* Handle bar (mobile only) */}
            <div className="flex justify-center pb-2 pt-3 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-slate-300" />
            </div>

            <div className="px-5 pb-6 pt-2 sm:p-6">
              {/* Header */}
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Location Details</h2>
                <button
                  onClick={() => setViewingLocation(null)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Detail grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Name</p>
                  <p className="mt-1 text-base text-slate-900">{viewingLocation.name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Code</p>
                  <p className="mt-1">
                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm text-slate-700">
                      {viewingLocation.code}
                    </span>
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Description</p>
                  <p className="mt-1 text-base text-slate-900">{viewingLocation.description}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Latitude</p>
                  <p className="mt-1 font-mono text-sm text-slate-900">{viewingLocation.latitude.toFixed(8)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Longitude</p>
                  <p className="mt-1 font-mono text-sm text-slate-900">{viewingLocation.longitude.toFixed(8)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Radius</p>
                  <p className="mt-1 text-base text-slate-900">{viewingLocation.radius} meters</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Type</p>
                  <p className="mt-1">
                    <span className="rounded-full border border-slate-300 px-2.5 py-1 text-sm font-medium text-slate-700">
                      {viewingLocation.type}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Status</p>
                  <p className="mt-1">
                    <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
                      viewingLocation.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                    }`}>
                      {viewingLocation.active ? "Active" : "Inactive"}
                    </span>
                  </p>
                </div>
              </div>

              {/* Config footer */}
              <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <span className="font-medium text-slate-700">Configuration:</span>{" "}
                {viewingLocation.requireSelfie ? "Selfie required" : "Selfie optional"},{" "}
                {viewingLocation.requireGps ? "GPS required" : "GPS optional"}
              </div>

              {/* Actions */}
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  onClick={() => { setViewingLocation(null); handleEdit(viewingLocation.id) }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  <Pencil className="size-4" />
                  Edit
                </button>
                <button
                  onClick={() => setViewingLocation(null)}
                  className="inline-flex items-center justify-center rounded-xl bg-black px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}