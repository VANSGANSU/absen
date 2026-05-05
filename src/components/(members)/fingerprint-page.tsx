"use client"

import * as React from "react"
import {
  Check,
  ChevronDown,
  Fingerprint,
  MonitorSmartphone,
  RefreshCw,
  Search,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import {
  fetchGroups,
  fetchMembers,
  fetchDevices,
  type GroupRecord,
  type OrganizationMember,
} from "@/lib/dashboard-data"
import { type AttendanceDeviceRecord } from "@/lib/devices-store"

export default function FingerprintPage() {
  const supabase = React.useMemo(() => createClient(), [])
  
  const [members, setMembers] = React.useState<OrganizationMember[]>([])
  const [groups, setGroups] = React.useState<GroupRecord[]>([])
  const [devices, setDevices] = React.useState<AttendanceDeviceRecord[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isReloading, setIsReloading] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedGroup, setSelectedGroup] = React.useState("All Groups")
  const [selectedStatus, setSelectedStatus] = React.useState("All Status")
  const [selectedDevice, setSelectedDevice] = React.useState("All Devices")
  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = React.useState(false)

  // Sort state
  const [sortColumn, setSortColumn] = React.useState<string>("name")
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc")

  const loadData = React.useCallback(async (isManualReload = false) => {
    if (isManualReload) {
      setIsReloading(true)
    } else {
      setIsLoading(true)
    }
    
    try {
      const [memberData, groupData, deviceData] = await Promise.all([
        fetchMembers(supabase),
        fetchGroups(supabase),
        fetchDevices(supabase),
      ])
      setMembers(memberData)
      setGroups(groupData)
      setDevices(deviceData)
      if (deviceData.length > 0 && selectedDevice === "All Devices") {
        setSelectedDevice(deviceData[0].name)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
      setIsReloading(false)
    }
  }, [supabase])

  React.useEffect(() => {
    void loadData()
  }, [loadData])

  // Extract unique groups for the filter dropdown
  const groupOptions = React.useMemo(() => {
    const options = groups.map((group) => group.name || group.code).filter(Boolean)
    return ["All Groups", ...Array.from(new Set(options)).sort()]
  }, [groups])

  // Enhance members with pseudo-random fingerprint data for UI
  const enhancedMembers = React.useMemo(() => {
    return members.map((member) => {
      // Deterministic pseudo-random generation based on member ID and Name
      const nameLen = member.name.length
      const idCode = member.id.charCodeAt(0) || 0
      
      const hasFinger1 = (nameLen + idCode) % 3 !== 0 // roughly 66% have finger 1
      const hasFinger2 = (nameLen * idCode) % 4 === 0 // roughly 25% have finger 2

      return {
        ...member,
        hasFinger1,
        hasFinger2,
      }
    })
  }, [members])

  const completeCount = enhancedMembers.filter(m => m.hasFinger1 && m.hasFinger2).length
  const partialCount = enhancedMembers.filter(m => (m.hasFinger1 || m.hasFinger2) && !(m.hasFinger1 && m.hasFinger2)).length
  const notRegisteredCount = enhancedMembers.filter(m => !m.hasFinger1 && !m.hasFinger2).length
  const totalCount = enhancedMembers.length

  const filteredMembers = React.useMemo(() => {
    let result = enhancedMembers.filter((member) => {
      if (selectedGroup !== "All Groups" && member.group !== selectedGroup) return false
      
      if (selectedStatus !== "All Status") {
        if (selectedStatus === "Complete" && (!member.hasFinger1 || !member.hasFinger2)) return false
        if (selectedStatus === "Partial" && ((!member.hasFinger1 && !member.hasFinger2) || (member.hasFinger1 && member.hasFinger2))) return false
        if (selectedStatus === "Not Registered" && (member.hasFinger1 || member.hasFinger2)) return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        if (!member.name.toLowerCase().includes(q) && !member.group.toLowerCase().includes(q)) {
          return false
        }
      }
      return true
    })

    result.sort((a, b) => {
      let valA: any = a[sortColumn as keyof typeof a]
      let valB: any = b[sortColumn as keyof typeof b]
      
      if (sortColumn === "hasFinger1") {
        valA = a.hasFinger1 ? 1 : 0
        valB = b.hasFinger1 ? 1 : 0
      } else if (sortColumn === "hasFinger2") {
        valA = a.hasFinger2 ? 1 : 0
        valB = b.hasFinger2 ? 1 : 0
      }

      if (typeof valA === "string") valA = valA.toLowerCase()
      if (typeof valB === "string") valB = valB.toLowerCase()

      if (valA < valB) return sortDirection === "asc" ? -1 : 1
      if (valA > valB) return sortDirection === "asc" ? 1 : -1
      return 0
    })

    return result
  }, [enhancedMembers, selectedGroup, selectedStatus, searchQuery, sortColumn, sortDirection])

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

  return (
    <div className="flex min-h-[calc(100vh-theme(spacing.16))] flex-col bg-slate-50/50 p-6 sm:p-8">
      {/* Top Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Check className="size-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Complete (2 Fingers)</p>
            <p className="text-xl font-bold text-slate-900">{completeCount}/{totalCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
            <Fingerprint className="size-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Partial (1 Finger)</p>
            <p className="text-xl font-bold text-slate-900">{partialCount}/{totalCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <Users className="size-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Not Registered</p>
            <p className="text-xl font-bold text-slate-900">{notRegisteredCount}/{totalCount}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {/* Device Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDeviceMenuOpen(!isDeviceMenuOpen)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <MonitorSmartphone className="size-4" />
              <span className="w-24 overflow-hidden text-ellipsis whitespace-nowrap text-left">{selectedDevice}</span>
              <ChevronDown className="size-4 text-slate-400" />
            </button>
            
            {isDeviceMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDeviceMenuOpen(false)} />
                <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  {devices.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-500">No devices found</div>
                  ) : devices.map((device) => (
                    <button
                      key={device.id}
                      onClick={() => {
                        setSelectedDevice(device.name)
                        setIsDeviceMenuOpen(false)
                      }}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                    >
                      <MonitorSmartphone className="mt-0.5 size-4 text-slate-400 shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700">{device.name}</span>
                        <span className="text-xs text-slate-500">{device.location}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Reload Button */}
          <button
            onClick={() => loadData(true)}
            disabled={isReloading}
            className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            aria-label="Reload"
          >
            <RefreshCw className={`size-4 ${isReloading ? "animate-spin text-emerald-600" : ""}`} />
          </button>
        </div>

        <div className="flex flex-1 items-center gap-2 sm:max-w-xl">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Nick name, Full name, or Groups"
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-slate-300"
            />
          </div>

          {/* Group Filter */}
          <div className="relative hidden w-40 sm:block">
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-4 pr-10 text-sm font-medium outline-none transition focus:border-slate-300"
            >
              {groupOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          </div>

          {/* Status Filter */}
          <div className="relative hidden w-36 sm:block">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-4 pr-10 text-sm font-medium outline-none transition focus:border-slate-300"
            >
              <option value="All Status">All Status</option>
              <option value="Complete">Complete</option>
              <option value="Partial">Partial</option>
              <option value="Not Registered">Not Registered</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/50 border-b border-slate-200 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-6 py-4 w-16">No</th>
                <th className="px-6 py-4">
                  <button onClick={() => handleSort('name')} className="flex items-center gap-2 uppercase hover:text-black transition">
                    Nick Name {renderSortIcon('name')}
                  </button>
                </th>
                <th className="px-6 py-4">
                  <button onClick={() => handleSort('name')} className="flex items-center gap-2 uppercase hover:text-black transition">
                    Full Name {renderSortIcon('name')}
                  </button>
                </th>
                <th className="px-6 py-4">
                  <button onClick={() => handleSort('group')} className="flex items-center gap-2 uppercase hover:text-black transition">
                    Group {renderSortIcon('group')}
                  </button>
                </th>
                <th className="px-6 py-4">
                  <button onClick={() => handleSort('hasFinger1')} className="flex items-center justify-center gap-2 uppercase w-full hover:text-black transition">
                    Finger 1 {renderSortIcon('hasFinger1')}
                  </button>
                </th>
                <th className="px-6 py-4">
                  <button onClick={() => handleSort('hasFinger2')} className="flex items-center justify-center gap-2 uppercase w-full hover:text-black transition">
                    Finger 2 {renderSortIcon('hasFinger2')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading && !isReloading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Loading data...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No fingerprint data found.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member, idx) => (
                  <tr key={member.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-slate-500">{idx + 1}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{member.name.split(' ')[0]}</td>
                    <td className="px-6 py-4 text-slate-700">{member.name}</td>
                    <td className="px-6 py-4 text-slate-500">{member.group || "No Group"}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        {member.hasFinger1 ? (
                          <span className="inline-flex w-28 items-center justify-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
                            <Check className="size-3.5" strokeWidth={3} />
                            Registered
                          </span>
                        ) : (
                          <span className="inline-flex w-28 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm">
                            <Fingerprint className="size-3.5" />
                            Finger 1
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        {member.hasFinger2 ? (
                          <span className="inline-flex w-28 items-center justify-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
                            <Check className="size-3.5" strokeWidth={3} />
                            Registered
                          </span>
                        ) : (
                          <span className="inline-flex w-28 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm">
                            <Fingerprint className="size-3.5" />
                            Finger 2
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer (Mock) */}
      {!isLoading && filteredMembers.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <div>
            Showing 1-{filteredMembers.length} of {totalCount} data
          </div>
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select className="rounded-md border border-slate-200 bg-white px-2 py-1 outline-none">
              <option>10</option>
              <option>20</option>
              <option>50</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
