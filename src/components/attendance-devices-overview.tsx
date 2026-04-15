"use client"

import * as React from "react"
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Pencil,
  Plus,
  Search,
  Smartphone,
  X,
} from "lucide-react"
import {
  DEVICES_STORAGE_KEY,
  deviceTypeOptions,
  seedDevices,
  type AttendanceDeviceRecord,
  type AttendanceDeviceType,
} from "@/lib/devices-store"

type DeviceStatusFilter = "Active" | "Inactive"
type DeviceTypeFilter = "All Types" | AttendanceDeviceType

function loadDevicesFromStorage() {
  if (typeof window === "undefined") {
    return seedDevices
  }

  const stored = window.localStorage.getItem(DEVICES_STORAGE_KEY)

  if (!stored) {
    window.localStorage.setItem(DEVICES_STORAGE_KEY, JSON.stringify(seedDevices))
    return seedDevices
  }

  try {
    const parsed = JSON.parse(stored) as AttendanceDeviceRecord[]
    return parsed.length ? parsed : seedDevices
  } catch {
    return seedDevices
  }
}

function persistDevices(devices: AttendanceDeviceRecord[]) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(DEVICES_STORAGE_KEY, JSON.stringify(devices))
}

function formatTodayCreatedAt() {
  return new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date())
}

export function AttendanceDevicesOverview() {
  const [devices, setDevices] = React.useState<AttendanceDeviceRecord[]>(seedDevices)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [rowsPerPage, setRowsPerPage] = React.useState("10")
  const [selectedType, setSelectedType] = React.useState<DeviceTypeFilter>("All Types")
  const [selectedStatus, setSelectedStatus] = React.useState<DeviceStatusFilter>("Active")
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [deviceType, setDeviceType] = React.useState<AttendanceDeviceType | "">("")
  const [serialNumber, setSerialNumber] = React.useState("")

  React.useEffect(() => {
    setDevices(loadDevicesFromStorage())
  }, [])

  const filteredDevices = devices.filter((item) => {
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

  const activeDevices = devices.filter((item) => item.active).length
  const totalDeviceTypes = deviceTypeOptions.length

  const resetModal = () => {
    setDeviceType("")
    setSerialNumber("")
  }

  const handleOpenModal = () => {
    resetModal()
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    resetModal()
  }

  const handleActivate = () => {
    if (!deviceType || !serialNumber.trim()) {
      return
    }

    const nextDevice: AttendanceDeviceRecord = {
      id: `device_${Date.now()}`,
      name: deviceType === "MOBILE" ? "Mobile Device" : deviceType,
      serialNumber: serialNumber.trim().toUpperCase(),
      type: deviceType,
      location: "-",
      active: true,
      createdAt: formatTodayCreatedAt(),
    }

    setDevices((current) => {
      const nextDevices = [nextDevice, ...current]
      persistDevices(nextDevices)
      return nextDevices
    })

    setSelectedStatus("Active")
    handleCloseModal()
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 sm:p-6">
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2.2rem]">
            Attendance Devices
          </h1>

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

            <div className="overflow-hidden rounded-[1rem] border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-[74rem] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-[0.95rem] font-semibold text-slate-600">
                      <th className="px-4 py-4">Device Name</th>
                      <th className="px-4 py-4">Serial Number</th>
                      <th className="px-4 py-4">Type</th>
                      <th className="px-4 py-4">Location</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4">Created</th>
                      <th className="px-4 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDevices.length ? (
                      filteredDevices.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-slate-200 transition hover:bg-slate-50 last:border-b-0"
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

            <div className="flex flex-col gap-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
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
        </div>
      </section>

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
                disabled={!deviceType || !serialNumber.trim()}
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
