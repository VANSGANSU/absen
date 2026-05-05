"use client"

import * as React from "react"
import {
  Check,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Pencil,
  Plus,
  Search,
  Smartphone,
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
  deviceTypeOptions,
  type AttendanceDeviceRecord,
  type AttendanceDeviceType,
} from "@/lib/devices-store"
import {
  ensureDashboardSeed,
  fetchDevices,
  fetchLocations,
  insertDevice,
} from "@/lib/dashboard-data"
import { type AttendanceLocationRecord } from "@/lib/locations-store"
import { createClient } from "@/lib/supabase/client"

type DeviceStatusFilter = "Active" | "Inactive"
type DeviceTypeFilter = "All Types" | AttendanceDeviceType

const ROWS_OPTIONS = ["10", "25", "50"] as const

export function AttendanceDevicesOverview() {
  const supabase = React.useMemo(() => createClient(), [])
  const [devices, setDevices] = React.useState<AttendanceDeviceRecord[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [rowsPerPage, setRowsPerPage] = React.useState<(typeof ROWS_OPTIONS)[number]>("10")
  const [isRowsPerPageOpen, setIsRowsPerPageOpen] = React.useState(false)
  const rowsPerPageRef = React.useRef<HTMLDivElement | null>(null)
  const [selectedType, setSelectedType] = React.useState<DeviceTypeFilter>("All Types")
  const [selectedStatus, setSelectedStatus] = React.useState<DeviceStatusFilter>("Active")
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [deviceType, setDeviceType] = React.useState<AttendanceDeviceType | "">("")
  const [serialNumber, setSerialNumber] = React.useState("")
  const [selectedLocation, setSelectedLocation] = React.useState("")
  const [modalError, setModalError] = React.useState("")

  const [locations, setLocations] = React.useState<AttendanceLocationRecord[]>([])

  const [alert, setAlert] = React.useState<{ type: "success" | "error"; message: string } | null>(null)

  const [sortColumn, setSortColumn] = React.useState<string>("createdAt")
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("desc")

  React.useEffect(() => {
    let isMounted = true

    const load = async (retryCount = 0) => {
      try {
        await ensureDashboardSeed(supabase)
        const settled = await Promise.allSettled([
          fetchDevices(supabase),
          fetchLocations(supabase),
        ])

        const [devResult, locResult] = settled

        if (isMounted) {
          if (devResult.status === "fulfilled") setDevices(devResult.value)
          else console.warn("Devices fetch failed:", devResult.reason?.message)

          if (locResult.status === "fulfilled") setLocations(locResult.value)
          else console.warn("Locations fetch failed:", locResult.reason?.message)

          const hasNetworkError = settled.some(
            (r) => r.status === "rejected" && r.reason?.message?.includes("Failed to fetch")
          )
          if (hasNetworkError && retryCount < 2) {
            console.warn(`Network error, retrying (attempt ${retryCount + 1})...`)
            await new Promise((resolve) => setTimeout(resolve, 1500 * (retryCount + 1)))
            return load(retryCount + 1)
          }
        }
      } catch (err) {
        console.warn("Device load error:", err)
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

  const filteredDevices = React.useMemo(() => {
    let result = devices.filter((item) => {
      const query = searchQuery.trim().toLowerCase()
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.serialNumber.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query)

      const matchesType = selectedType === "All Types" ? true : item.type === selectedType
      const matchesStatus = selectedStatus === "Active" ? item.active : !item.active

      return matchesQuery && matchesType && matchesStatus
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
  }, [devices, searchQuery, selectedType, selectedStatus, sortColumn, sortDirection])

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
      <ArrowUp className="size-3.5 text-black" />
    ) : (
      <ArrowDown className="size-3.5 text-black" />
    )
  }

  const activeDevices = devices.filter((item) => item.active).length
  const totalDeviceTypes = deviceTypeOptions.length

  const resetModal = () => {
    setDeviceType("")
    setSerialNumber("")
    setSelectedLocation("")
  }

  const handleOpenModal = () => {
    resetModal()
    setModalError("")
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    resetModal()
  }

  const handleActivate = () => {
    void (async () => {
      if (!deviceType || !serialNumber.trim() || !selectedLocation) {
        setModalError("Device type, serial number, and location wajib diisi.")
        return
      }

      try {
        await insertDevice(supabase, {
          name: deviceType === "MOBILE" ? "Mobile Device" : deviceType,
          serialNumber: serialNumber.trim().toUpperCase(),
          type: deviceType,
          location: selectedLocation,
          active: true,
        })
        const nextDevices = await fetchDevices(supabase)
        setDevices(nextDevices)
        setSelectedStatus("Active")
        handleCloseModal()
        setAlert({ type: "success", message: "Device activated successfully." })
        setTimeout(() => setAlert(null), 3000)
      } catch (error) {
        setModalError(error instanceof Error ? error.message : "Failed to activate device.")
        setAlert({ type: "error", message: error instanceof Error ? error.message : "Failed to activate device." })
        setTimeout(() => setAlert(null), 3000)
      }
    })()
  }

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
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2.2rem]">
            Attendance Devices
          </h1>


          {/* --- SUMMARY CARDS: Ringkasan total device, device aktif, dan tipe device --- */}
          <div className="grid overflow-hidden rounded-[1rem] border border-slate-200 bg-white xl:grid-cols-3">
            {[
              {
                label: "Total Devices",
                value: devices.length,
                icon: Smartphone,
                tone: "text-slate-950",
              },
              {
                label: "Active Devices",
                value: activeDevices,
                icon: CheckCircle2,
                tone: "text-emerald-500",
              },
              {
                label: "Device Types",
                value: totalDeviceTypes,
                icon: Filter,
                tone: "text-slate-500",
              },
            ].map((card, index) => (
              <div
                key={card.label}
                className={`flex items-center gap-5 px-7 py-8 ${
                  index ? "border-t border-slate-200 xl:border-l xl:border-t-0" : ""
                }`}
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 ${card.tone}`}
                >
                  <card.icon className="size-8" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-[1.05rem] text-slate-500">{card.label}</p>
                  <p className="mt-1 text-[2rem] font-semibold tracking-tight text-slate-950">
                    {card.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {/* --- LIST HEADER: Kontrol Daftar (Search, Filter Tipe/Status, Add) --- */}
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <h2 className="text-[2rem] font-semibold tracking-tight text-slate-950">
                Devices List
              </h2>

              <div className="flex flex-col gap-3 xl:flex-row">
                <div className="flex min-w-[20rem] items-center rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3">
                  <Search className="size-5 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search devices..."
                    className="min-w-0 flex-1 bg-transparent px-3 text-[1.05rem] text-slate-900 outline-hidden placeholder:text-slate-400"
                  />
                </div>

                <div className="relative">
                  <select
                    value={selectedType}
                    onChange={(event) => setSelectedType(event.target.value as DeviceTypeFilter)}
                    className="min-w-[17.5rem] appearance-none rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3 pr-10 text-[1.05rem] text-slate-950 outline-hidden"
                  >
                    <option value="All Types">All Types</option>
                    {deviceTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                </div>

                <div className="relative">
                  <select
                    value={selectedStatus}
                    onChange={(event) =>
                      setSelectedStatus(event.target.value as DeviceStatusFilter)
                    }
                    className="min-w-[7.8rem] appearance-none rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3 pr-10 text-[1.05rem] text-slate-950 outline-hidden"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                </div>

                <button
                  type="button"
                  onClick={handleOpenModal}
                  className="inline-flex items-center justify-center gap-3 rounded-[0.95rem] bg-black px-6 py-3 text-[1.05rem] font-medium text-white"
                >
                  <Plus className="size-5" />
                  Activate
                </button>
              </div>
            </div>

            {/* --- TABEL DEVICE: Daftar semua perangkat absensi --- */}
            <div className="rounded-[1rem] border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[74rem] border-collapse">
                  <thead className="rounded-t-[1rem]">
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-left text-xs uppercase tracking-[0.12em] text-slate-500 rounded-t-[1rem]">
                      <th className="px-4 py-4">
                        <button onClick={() => handleSort('name')} className="flex items-center gap-2 hover:text-black transition">
                          Device Name {renderSortIcon('name')}
                        </button>
                      </th>
                      <th className="px-4 py-4">
                        <button onClick={() => handleSort('serialNumber')} className="flex items-center gap-2 hover:text-black transition">
                          Serial Number {renderSortIcon('serialNumber')}
                        </button>
                      </th>
                      <th className="px-4 py-4">
                        <button onClick={() => handleSort('type')} className="flex items-center gap-2 hover:text-black transition">
                          Type {renderSortIcon('type')}
                        </button>
                      </th>
                      <th className="px-4 py-4">
                        <button onClick={() => handleSort('location')} className="flex items-center gap-2 hover:text-black transition">
                          Location {renderSortIcon('location')}
                        </button>
                      </th>
                      <th className="px-4 py-4">
                        <button onClick={() => handleSort('active')} className="flex items-center gap-2 hover:text-black transition">
                          Status {renderSortIcon('active')}
                        </button>
                      </th>
                      <th className="px-4 py-4">
                        <button onClick={() => handleSort('createdAt')} className="flex items-center gap-2 hover:text-black transition">
                          Created {renderSortIcon('createdAt')}
                        </button>
                      </th>
                      <th className="px-4 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDevices.length ? (
                      filteredDevices.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-slate-100 last:border-0 text-slate-700"
                        >
                          <td className="px-4 py-5 text-[1.1rem] font-medium text-slate-950">
                            {item.name}
                          </td>
                          <td className="px-4 py-5 text-[1.05rem] text-slate-500">
                            {item.serialNumber}
                          </td>
                          <td className="px-4 py-5 text-[1.05rem] text-slate-500">{item.type}</td>
                          <td className="px-4 py-5 text-[1.05rem] text-slate-500">
                            {item.location}
                          </td>
                          <td className="px-4 py-5">
                            <span
                              className={`rounded-full px-3 py-1 text-sm font-medium ${
                                item.active
                                  ? "bg-emerald-500 text-white"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {item.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-5 text-[1.05rem] text-slate-500">
                            {item.createdAt}
                          </td>
                          <td className="px-4 py-5 text-right">
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
                            >
                              <Pencil className="size-5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-14 text-center text-[1.15rem] italic text-slate-400"
                        >
                          No device records found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* --- PAGINATION: Navigasi halaman dan jumlah baris --- */}
            <div className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between rounded-b-[1rem] bg-white">
              <div className="flex flex-wrap items-center gap-5">
                <p>
                  Showing{" "}
                  <span className="font-semibold text-slate-950">
                    {filteredDevices.length ? `1-${filteredDevices.length}` : "0-0"}
                  </span>{" "}
                  of <span className="font-semibold text-slate-950">{filteredDevices.length}</span>{" "}
                  data
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500">Rows per page:</span>
                  <div className="relative" ref={rowsPerPageRef}>
                    <button
                      type="button"
                      onClick={() => setIsRowsPerPageOpen(!isRowsPerPageOpen)}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                    >
                      {rowsPerPage}
                      <ChevronDown className={`size-4 text-slate-400 transition-transform ${isRowsPerPageOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isRowsPerPageOpen && (
                      <div className="absolute top-full left-0 z-50 mt-1 w-24 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                        {ROWS_OPTIONS.map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => {
                              setRowsPerPage(n)
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
        </div>
      </section>

      {/* --- MODAL ACTIVATE: Form untuk menambah/mengaktifkan perangkat baru --- */}
      {isModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-[40rem] rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
              <h2 className="text-[2rem] font-semibold tracking-tight text-slate-950">
                Activate Device
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-6 pt-6">
              {modalError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {modalError}
                </div>
              ) : null}
              <div className="space-y-2">
                <label className="block text-[1rem] font-medium text-slate-900">Device Type</label>
                <div className="relative">
                  <select
                    value={deviceType}
                    onChange={(event) => setDeviceType(event.target.value as AttendanceDeviceType)}
                    className="w-full appearance-none rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3 pr-10 text-[1.05rem] text-slate-900 outline-hidden"
                  >
                    <option value="">Select device type...</option>
                    {deviceTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[1rem] font-medium text-slate-900">Serial Number</label>
                <div className="flex overflow-hidden rounded-[0.95rem] border border-slate-200 bg-white">
                  <span className="inline-flex items-center border-r border-slate-200 px-4 text-[1.05rem] font-medium text-slate-700">
                    CODE
                  </span>
                  <input
                    value={serialNumber}
                    onChange={(event) => setSerialNumber(event.target.value)}
                    placeholder="Enter serial number"
                    className="min-w-0 flex-1 bg-transparent px-4 py-3 text-[1.05rem] text-slate-900 outline-hidden placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[1rem] font-medium text-slate-900">Location</label>
                <div className="relative">
                  <select
                    value={selectedLocation}
                    onChange={(event) => setSelectedLocation(event.target.value)}
                    className="w-full appearance-none rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3 pr-10 text-[1.05rem] text-slate-900 outline-hidden"
                  >
                    <option value="">Select location...</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.name}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-start gap-4">
              <button
                type="button"
                onClick={handleCloseModal}
                className="inline-flex items-center justify-center rounded-[0.95rem] border border-slate-200 bg-white px-5 py-3 text-[1.05rem] font-medium text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleActivate}
                disabled={!deviceType || !serialNumber.trim() || !selectedLocation}
                className="inline-flex items-center justify-center rounded-[0.95rem] bg-black px-5 py-3 text-[1.05rem] font-medium text-white disabled:bg-slate-400"
              >
                Activate
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
