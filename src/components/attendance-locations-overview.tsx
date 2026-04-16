"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Eye,
  MapPin,
  Pencil,
  Plus,
  Search,
  UsersRound,
  X,
} from "lucide-react"
import {
  LOCATIONS_STORAGE_KEY,
  seedLocations,
  type AttendanceLocationRecord,
} from "@/lib/locations-store"

function loadLocationsFromStorage() {
  if (typeof window === "undefined") {
    return seedLocations
  }

  const stored = window.localStorage.getItem(LOCATIONS_STORAGE_KEY)

  if (!stored) {
    window.localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(seedLocations))
    return seedLocations
  }

  try {
    const parsed = JSON.parse(stored) as AttendanceLocationRecord[]
    return parsed.length ? parsed : seedLocations
  } catch {
    return seedLocations
  }
}

function persistLocations(locations: AttendanceLocationRecord[]) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(locations))
}

export function AttendanceLocationsOverview() {
  const router = useRouter()
  const [locations, setLocations] = React.useState<AttendanceLocationRecord[]>(seedLocations)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [rowsPerPage, setRowsPerPage] = React.useState("10")
  const [isOpeningAdd, setIsOpeningAdd] = React.useState(false)

  // State untuk modal view
  const [viewingLocation, setViewingLocation] = React.useState<AttendanceLocationRecord | null>(null)

  React.useEffect(() => {
    setLocations(loadLocationsFromStorage())
  }, [])

  const filteredLocations = locations.filter((item) => {
    const query = searchQuery.trim().toLowerCase()

    return (
      item.name.toLowerCase().includes(query) ||
      item.code.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query)
    )
  })

  const activeLocations = locations.filter((item) => item.active).length

  const handleToggleStatus = (id: string) => {
    setLocations((current) => {
      const nextLocations = current.map((item) =>
        item.id === id ? { ...item, active: !item.active } : item
      )
      persistLocations(nextLocations)
      return nextLocations
    })
  }

  const handleOpenAdd = async () => {
    setIsOpeningAdd(true)

    try {
      const response = await fetch("/api/navigation/location-add-access", {
        method: "POST",
      })

      if (!response.ok) {
        return
      }

      router.push("/dashboard/attendance/locations/add")
      router.refresh()
    } finally {
      setIsOpeningAdd(false)
    }
  }

  const handleEdit = (id: string) => {
    router.push(`/dashboard/attendance/locations/edit/${id}`)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 sm:p-6">
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-500 sm:text-[2.2rem] ">
            Location
          </h1>

          <div className="grid overflow-hidden rounded-[1rem] border border-slate-200 bg-white xl:grid-cols-3">
            {[
              {
                label: "Total Locations",
                value: locations.length,
                icon: MapPin,
                tone: "text-slate-950",
              },
              {
                label: "Active Locations",
                value: activeLocations,
                icon: CheckCircle2,
                tone: "text-emerald-500",
              }          
            ].map((card, index) => (
              <div
                key={card.label}
                className={`flex items-center gap-5 px-7 py-8 ${
                  index ? "border-t border-slate-200 xl:border-l xl:border-t-0" : ""
                }`}
              >
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 ${card.tone}`}>
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

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <h2 className="text-[2rem] font-semibold tracking-tight text-slate-950">
              Locations List
            </h2>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex min-w-[23rem] items-center rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3">
                <Search className="size-5 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by name, location..."
                  className="min-w-0 flex-1 bg-transparent px-3 text-[1.05rem] text-slate-900 outline-hidden placeholder:text-slate-400"
                />
              </div>

              <button
                type="button"
                onClick={handleOpenAdd}
                disabled={isOpeningAdd}
                className="inline-flex items-center justify-center gap-3 rounded-[0.95rem] bg-black px-6 py-3 text-[1.05rem] font-medium text-white disabled:opacity-70"
              >
                <Plus className="size-5" />
                {isOpeningAdd ? "Opening..." : "Add"}
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[1rem] border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-[78rem] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[0.95rem] font-semibold text-slate-600">
                    <th className="px-4 py-4">Device Name</th>
                    <th className="px-4 py-4">Code</th>
                    <th className="px-4 py-4">Location</th>
                    <th className="px-4 py-4">Coordinates</th>
                    <th className="px-4 py-4">Radius</th>
                    <th className="px-4 py-4">Type</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLocations.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-200 transition hover:bg-slate-50 last:border-b-0"
                    >
                      <td className="px-4 py-5 text-[1.1rem] font-medium text-slate-950">{item.name}</td>
                      <td className="px-4 py-5">
                        <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-600">
                          {item.code}
                        </span>
                      </td>
                      <td className="px-4 py-5 text-[1.05rem] text-slate-500">{item.description}</td>
                      <td className="px-4 py-5 text-[1.05rem] text-slate-500">
                        {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
                      </td>
                      <td className="px-4 py-5 text-[1.05rem] text-slate-500">{item.radius}m</td>
                      <td className="px-4 py-5">
                        <span className="rounded-full border border-slate-300 px-3 py-1 text-sm font-medium text-slate-600">
                          {item.type}
                        </span>
                      </td>
                      <td className="px-4 py-5">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item.id)}
                            className={`relative inline-flex h-7 w-11 items-center rounded-full ${
                              item.active ? "bg-slate-400" : "bg-slate-200"
                            } transition`}
                            aria-pressed={item.active}
                            aria-label={`Set ${item.name} as ${item.active ? "inactive" : "active"}`}
                          >
                            <span
                              className={`absolute inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm transition ${
                                item.active ? "left-5" : "left-1"
                              }`}
                            >
                              <CheckCircle2 className="size-3.5" />
                            </span>
                          </button>
                          <span
                            className={`rounded-full px-3 py-1 text-sm font-medium ${
                              item.active
                                ? "bg-emerald-500 text-white"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {item.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingLocation(item)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                            aria-label="View location"
                          >
                            <Eye className="size-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(item.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                            aria-label="Edit location"
                          >
                            <Pencil className="size-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-5">
              <p>
                Showing{" "}
                <span className="font-semibold text-slate-950">
                  {filteredLocations.length ? `1-${filteredLocations.length}` : "0-0"}
                </span>{" "}
                of <span className="font-semibold text-slate-950">{filteredLocations.length}</span> data
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

      {/* Modal untuk view detail lokasi */}
      {viewingLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Location Details</h2>
              <button
                onClick={() => setViewingLocation(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">Name</label>
                  <p className="mt-1 text-base text-slate-900">{viewingLocation.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Code</label>
                  <p className="mt-1 text-base text-slate-900">{viewingLocation.code}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-slate-500">Description</label>
                  <p className="mt-1 text-base text-slate-900">{viewingLocation.description}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Latitude</label>
                  <p className="mt-1 text-base text-slate-900">{viewingLocation.latitude.toFixed(8)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Longitude</label>
                  <p className="mt-1 text-base text-slate-900">{viewingLocation.longitude.toFixed(8)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Radius</label>
                  <p className="mt-1 text-base text-slate-900">{viewingLocation.radius} meters</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Type</label>
                  <p className="mt-1 text-base text-slate-900">{viewingLocation.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Status</label>
                  <p className="mt-1">
                    <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
                      viewingLocation.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
                    }`}>
                      {viewingLocation.active ? "Active" : "Inactive"}
                    </span>
                  </p>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm text-slate-500">
                  <span className="font-medium">Configuration:</span>{" "}
                  {viewingLocation.requireSelfie ? "Selfie required" : "Selfie optional"},{" "}
                  {viewingLocation.requireGps ? "GPS required" : "GPS optional"}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewingLocation(null)}
                className="rounded-lg bg-black px-6 py-2 font-medium text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}