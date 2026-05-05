"use client"

import * as React from "react"
import * as XLSX from "xlsx"
import {
  Check,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UsersRound,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import {
  deleteGroup,
  ensureDashboardSeed,
  fetchGroups,
  fetchMembers,
  insertGroup,
  type GroupRecord,
  type GroupStatus,
  type OrganizationMember,
  updateGroup,
} from "@/lib/dashboard-data"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"

type GroupFormState = {
  code: string
  name: string
  description: string
  status: GroupStatus
}

const STATUS_OPTIONS = ["All Status", "Active", "Inactive"] as const
const ROWS_OPTIONS = [10, 25, 50] as const

const EMPTY_FORM: GroupFormState = {
  code: "",
  name: "",
  description: "",
  status: "Active",
}

function normalizeText(text: string | null | undefined) {
  return (text || "").toLowerCase().trim()
}

function normalizeKey(text: string | null | undefined) {
  return (text || "").toLowerCase().replace(/[^a-z0-9]/g, "")
}

function isNoGroup(group: GroupRecord) {
  return normalizeText(group.code) === "no-group" || normalizeText(group.name) === "no group"
}

function matchesGroupValue(group: GroupRecord, value: string | null | undefined) {
  if (!value) return false
  const normalizedValue = normalizeText(value)
  const normalizedCode = normalizeText(group.code)
  const normalizedName = normalizeText(group.name)

  return (
    normalizedValue === normalizedCode ||
    normalizedValue === normalizedName ||
    normalizeKey(normalizedValue) === normalizeKey(normalizedCode) ||
    normalizeKey(normalizedValue) === normalizeKey(normalizedName)
  )
}

function matchesMemberToGroup(group: GroupRecord, member: OrganizationMember) {
  if (member.groupId && member.groupId === group.id) {
    return true
  }

  return matchesGroupValue(group, member.group)
}

function getMembersForGroup(group: GroupRecord, members: OrganizationMember[]) {
  if (isNoGroup(group)) {
    return members.filter((member) => {
      const memberGroup = normalizeText(member.group)
      return !member.groupId && (!memberGroup || memberGroup === "no group")
    })
  }

  return members.filter((member) => matchesMemberToGroup(group, member))
}

function getMemberCount(group: GroupRecord, members: OrganizationMember[]) {
  return getMembersForGroup(group, members).length
}

function statusBadgeClass(status: GroupStatus) {
  return status === "Active"
    ? "border-emerald-200 bg-emerald-50 text-emerald-600"
    : "border-slate-200 bg-slate-50 text-slate-500"
}

export default function GroupPage() {
  const supabase = React.useMemo(() => createClient(), [])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [groups, setGroups] = React.useState<GroupRecord[]>([])
  const [members, setMembers] = React.useState<OrganizationMember[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState("")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedStatus, setSelectedStatus] =
    React.useState<(typeof STATUS_OPTIONS)[number]>("All Status")
  const [currentPage, setCurrentPage] = React.useState(1)

  const [sortColumn, setSortColumn] = React.useState<string>("name")
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc")

  const [rowsPerPage, setRowsPerPage] = React.useState<(typeof ROWS_OPTIONS)[number]>(10)
  const [isRowsPerPageOpen, setIsRowsPerPageOpen] = React.useState(false)
  const rowsPerPageRef = React.useRef<HTMLDivElement | null>(null)
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<GroupRecord | null>(null)
  const [editingGroup, setEditingGroup] = React.useState<GroupRecord | null>(null)
  const [detailGroup, setDetailGroup] = React.useState<GroupRecord | null>(null)
  const [form, setForm] = React.useState<GroupFormState>(EMPTY_FORM)
  const [isSaving, setIsSaving] = React.useState(false)

  const [alert, setAlert] = React.useState<{ type: "success" | "error"; message: string } | null>(null)

  const loadData = React.useCallback(async () => {
    setIsLoading(true)
    setLoadError("")

    try {
      await ensureDashboardSeed(supabase)
      const [nextGroups, nextMembers] = await Promise.all([
        fetchGroups(supabase),
        fetchMembers(supabase),
      ])

      const sortedGroups = nextGroups
        .slice()
        .sort((a, b) => {
          if (isNoGroup(a)) return -1
          if (isNoGroup(b)) return 1
          return a.name.localeCompare(b.name)
        })

      setGroups(sortedGroups)
      setMembers(nextMembers)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load groups.")
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  React.useEffect(() => {
    void loadData()
  }, [loadData])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedStatus, rowsPerPage])

  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rowsPerPageRef.current?.contains(event.target as Node)) setIsRowsPerPageOpen(false)
    }
    window.addEventListener("mousedown", handlePointerDown)
    return () => window.removeEventListener("mousedown", handlePointerDown)
  }, [])

  const filteredGroups = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    let result = groups.filter((group) => {
      if (selectedStatus !== "All Status" && group.status !== selectedStatus) return false
      if (!query) return true

      return (
        group.code.toLowerCase().includes(query) ||
        group.name.toLowerCase().includes(query) ||
        group.description.toLowerCase().includes(query)
      )
    })

    result.sort((a, b) => {
      if (isNoGroup(a)) return -1
      if (isNoGroup(b)) return 1

      let valA: any = a[sortColumn as keyof typeof a]
      let valB: any = b[sortColumn as keyof typeof b]

      if (sortColumn === "members") {
        valA = getMemberCount(a, members)
        valB = getMemberCount(b, members)
      }

      if (typeof valA === "string") valA = valA.toLowerCase()
      if (typeof valB === "string") valB = valB.toLowerCase()

      if (valA < valB) return sortDirection === "asc" ? -1 : 1
      if (valA > valB) return sortDirection === "asc" ? 1 : -1
      return 0
    })

    return result
  }, [groups, members, searchQuery, selectedStatus, sortColumn, sortDirection])

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

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / rowsPerPage))
  const safePage = Math.min(currentPage, totalPages)
  const visibleGroups = filteredGroups.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage)
  const showFrom = filteredGroups.length === 0 ? 0 : (safePage - 1) * rowsPerPage + 1
  const showTo = Math.min(safePage * rowsPerPage, filteredGroups.length)
  const detailMembers = React.useMemo(() => {
    if (!detailGroup) return []
    return getMembersForGroup(detailGroup, members)
  }, [detailGroup, members])

  const handleOpenAdd = () => {
    setEditingGroup(null)
    setForm(EMPTY_FORM)
    setIsAddOpen(true)
  }

  const handleOpenEdit = (group: GroupRecord) => {
    setEditingGroup(group)
    setForm({
      code: group.code,
      name: group.name,
      description: group.description,
      status: group.status,
    })
    setIsEditOpen(true)
  }

  const handleCloseModal = () => {
    setIsAddOpen(false)
    setIsEditOpen(false)
    setEditingGroup(null)
    setForm(EMPTY_FORM)
  }

  const handleSaveGroup = () => {
    void (async () => {
      const name = form.name.trim()
      const code = form.code.trim() || name
      const description = form.description.trim()

      if (!name || !code) return

      setIsSaving(true)
      try {
        if (editingGroup) {
          await updateGroup(supabase, editingGroup.id, {
            code,
            name,
            description,
            status: form.status,
          })
          setAlert({ type: "success", message: "Group updated successfully." })
        } else {
          await insertGroup(supabase, {
            code,
            name,
            description,
            status: form.status,
          })
          setAlert({ type: "success", message: "Group added successfully." })
        }

        handleCloseModal()
        await loadData()
        setTimeout(() => setAlert(null), 3000)
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Failed to save group.")
        setAlert({ type: "error", message: error instanceof Error ? error.message : "Failed to save group." })
        setTimeout(() => setAlert(null), 3000)
      } finally {
        setIsSaving(false)
      }
    })()
  }

  const handleDeleteGroup = () => {
    if (!deleteTarget) return

    void (async () => {
      try {
        await deleteGroup(supabase, deleteTarget.id)
        setDeleteTarget(null)
        await loadData()
        setAlert({ type: "success", message: "Group deleted successfully." })
        setTimeout(() => setAlert(null), 3000)
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Failed to delete group.")
        setAlert({ type: "error", message: error instanceof Error ? error.message : "Failed to delete group." })
        setTimeout(() => setAlert(null), 3000)
      }
    })()
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const imported = await new Promise<GroupFormState[]>((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (loadEvent) => {
          try {
            const binary = loadEvent.target?.result
            const workbook = XLSX.read(binary, { type: "binary" })
            const sheetName = workbook.SheetNames[0]
            const sheet = workbook.Sheets[sheetName]
            const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet)

            const mapped = rows
              .map((row) => {
                const findValue = (keys: string[]) => {
                  const foundKey = Object.keys(row).find((key) =>
                    keys.some((needle) => key.toLowerCase().includes(needle.toLowerCase()))
                  )
                  return foundKey ? String(row[foundKey] ?? "").trim() : ""
                }

                const name = findValue(["name", "group", "nama"])
                const code = findValue(["code", "kode", "slug"])
                const description = findValue(["description", "desc", "keterangan", "remarks"])
                const status = findValue(["status"]).toLowerCase() === "inactive" ? "Inactive" : "Active"

                if (!name && !code) return null

                return {
                  code: code || name,
                  name: name || code,
                  description,
                  status,
                } satisfies GroupFormState
              })
              .filter(Boolean) as GroupFormState[]

            resolve(mapped)
          } catch (error) {
            reject(error)
          }
        }

        reader.onerror = () => reject(new Error("Failed to read file."))
        reader.readAsBinaryString(file)
      })

      if (imported.length === 0) return

      const existingGroups = groups

      for (const item of imported) {
        const normalizedCode = item.code.trim()
        const normalizedName = item.name.trim()
        const existing = existingGroups.find(
          (group) =>
            normalizeText(group.code) === normalizeText(normalizedCode) ||
            normalizeText(group.name) === normalizeText(normalizedName)
        )

        if (existing) {
          // sequential writes keep the patch simple and predictable
          // eslint-disable-next-line no-await-in-loop
          await updateGroup(supabase, existing.id, {
            code: normalizedCode || existing.code,
            name: normalizedName || existing.name,
            description: item.description.trim(),
            status: item.status,
          })
        } else {
          // eslint-disable-next-line no-await-in-loop
          await insertGroup(supabase, {
            code: normalizedCode || normalizedName,
            name: normalizedName || normalizedCode,
            description: item.description.trim(),
            status: item.status,
          })
        }
      }

      await loadData()
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to import groups.")
    } finally {
      event.target.value = ""
    }
  }

  return (
    <div className="flex flex-col space-y-8 p-6 sm:p-8">
      {/* Alert section outside the main flow */}
      {alert && (
            <Alert className={`max-w-md ${alert.type === "success" ? "" : "border-red-200 bg-red-50"}`}>
              {alert.type === "success" ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
              <AlertTitle>{alert.type === "success" ? "Success" : "Error"}</AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          )}

          {/* --- HEADER: Judul Halaman & Tombol Aksi --- */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Groups
              </h1>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search groups..."
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm outline-none transition focus:border-slate-300 placeholder:text-slate-400 shadow-sm"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <select
                    value={selectedStatus}
                    onChange={(event) =>
                      setSelectedStatus(event.target.value as (typeof STATUS_OPTIONS)[number])
                    }
                    className="appearance-none rounded-lg border border-slate-200 bg-white px-4 py-2 pr-10 text-sm font-medium text-slate-900 outline-none hover:bg-slate-50 transition shadow-sm"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                </div>

                <button
                  type="button"
                  onClick={loadData}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition shadow-sm"
                >
                  <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
                  <span className="hidden lg:inline">Refresh</span>
                </button>

                <button
                  type="button"
                  onClick={handleImportClick}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition shadow-sm"
                >
                  <FileUp className="size-4" />
                  <span className="hidden lg:inline">Import</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleImportFile}
                />

                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-black px-4 text-sm font-medium text-white hover:bg-slate-800 transition shadow-sm"
                >
                  <Plus className="size-4" />
                  <span className="inline">Add</span>
                </button>
              </div>
            </div>
          </div>

          {loadError ? (
            <div className="rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {loadError}
            </div>
          ) : null}

          {/* --- TABEL GRUP: Daftar semua grup yang tersedia --- */}
          <div className="w-full">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center gap-3 text-slate-500">
                <Loader2 className="size-6 animate-spin text-slate-400" />
                <span>Memuat data grup...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-transparent border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="px-4 py-4 font-medium uppercase text-[0.7rem] tracking-wider">Code</th>
                      <th className="px-4 py-4 font-medium uppercase text-[0.7rem] tracking-wider">Name</th>
                      <th className="px-4 py-4 font-medium uppercase text-[0.7rem] tracking-wider">Description</th>
                      <th className="px-4 py-4 font-medium uppercase text-[0.7rem] tracking-wider">Status</th>
                      <th className="px-4 py-4 font-medium uppercase text-[0.7rem] tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleGroups.length ? (
                      visibleGroups.map((group) => (
                        <tr key={group.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-5">
                            <span className="font-mono text-slate-900 cursor-default">
                              {group.code}
                            </span>
                          </td>
                          <td className="px-4 py-5 font-medium text-slate-900">
                            {group.name}
                          </td>
                          <td className="px-4 py-5 text-slate-500">
                            {group.description || "-"}
                          </td>
                          <td className="px-4 py-5">
                            <span className={`inline-flex rounded-md px-2 py-0.5 text-[0.7rem] font-bold ${statusBadgeClass(group.status)}`}>
                              {group.status}
                            </span>
                          </td>
                          <td className="px-4 py-5">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(group)}
                                className="text-slate-400 hover:text-slate-600 transition"
                              >
                                <Pencil className="size-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDetailGroup(group)
                                  setIsDetailOpen(true)
                                }}
                                className="text-slate-400 hover:text-slate-600 transition"
                              >
                                <ChevronRight className="size-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(group)}
                                className="text-slate-400 hover:text-red-500 transition"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                          No groups found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* --- PAGINATION: Kontrol navigasi halaman grup --- */}
          <div className="flex flex-col gap-4 border-t border-slate-200 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-6">
              <p>
                Showing{" "}
                <span className="font-semibold text-slate-950">
                  {filteredGroups.length === 0 ? "0" : `${showFrom}–${showTo}`}
                </span>{" "}
                of <span className="font-semibold text-slate-950">{filteredGroups.length}</span> data
              </p>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Rows per page:</span>
                <div className="relative" ref={rowsPerPageRef}>
                  <button
                    type="button"
                    onClick={() => setIsRowsPerPageOpen(!isRowsPerPageOpen)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                  >
                    <span>{rowsPerPage}</span>
                    <ChevronDown className={`size-3.5 text-slate-400 transition-transform ${isRowsPerPageOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isRowsPerPageOpen && (
                    <div className="absolute bottom-full left-0 z-50 mb-1 w-20 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                      {ROWS_OPTIONS.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            setRowsPerPage(n)
                            setCurrentPage(1)
                            setIsRowsPerPageOpen(false)
                          }}
                          className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm transition ${
                            rowsPerPage === n ? "bg-slate-50 text-black font-semibold" : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <span>{n}</span>
                          {rowsPerPage === n && <Check className="size-3 text-black" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safePage <= 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1)
                .filter((page) => Math.abs(page - safePage) <= 2)
                .map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-semibold transition ${
                      page === safePage
                        ? "bg-black text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={safePage >= totalPages}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

      {isAddOpen || isEditOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[520px] rounded-2xl bg-white shadow-2xl">
            <div className="px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    {isEditOpen ? "Edit Group" : "Add Group"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {isEditOpen ? "Update group details." : "Create a new group for your members."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-[0.9rem] font-semibold text-slate-900">
                    Code
                  </label>
                  <input
                    value={form.code}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        code: event.target.value,
                      }))
                    }
                    placeholder="e.g., x_rpl"
                    className="w-full rounded-[0.6rem] border border-slate-200 px-4 py-[0.75rem] text-sm outline-none transition focus:border-slate-300"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[0.9rem] font-semibold text-slate-900">
                    Name
                  </label>
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="e.g., X RPL"
                    className="w-full rounded-[0.6rem] border border-slate-200 px-4 py-[0.75rem] text-sm outline-none transition focus:border-slate-300"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[0.9rem] font-semibold text-slate-900">
                    Description
                  </label>
                  <input
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="e.g., Rekayasa Perangkat Lunak"
                    className="w-full rounded-[0.6rem] border border-slate-200 px-4 py-[0.75rem] text-sm outline-none transition focus:border-slate-300"
                  />
                </div>

                <div className="flex items-center justify-between rounded-[0.8rem] border border-slate-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Status</p>
                    <p className="text-sm text-slate-500">Activate or disable this group.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        status: current.status === "Active" ? "Inactive" : "Active",
                      }))
                    }
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${
                      form.status === "Active" ? "bg-slate-400" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`absolute inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm transition ${
                        form.status === "Active" ? "left-7" : "left-1"
                      }`}
                    >
                      <Check className="size-3.5" />
                    </span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSaveGroup}
                  disabled={isSaving}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving...
                    </>
                  ) : isEditOpen ? (
                    "Update"
                  ) : (
                    "Create"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isDetailOpen && detailGroup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[560px] rounded-2xl bg-white shadow-2xl">
            <div className="px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Group Details</h2>
                  <p className="mt-1 text-sm text-slate-500">Members connected to this group.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailOpen(false)
                    setDetailGroup(null)
                  }}
                  className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[0.8rem] border border-slate-200 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Code
                    </p>
                    <p className="mt-1 text-base font-medium text-slate-900">{detailGroup.code}</p>
                  </div>
                  <div className="rounded-[0.8rem] border border-slate-200 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Members
                    </p>
                    <p className="mt-1 text-base font-medium text-slate-900">
                      {detailMembers.length}
                    </p>
                  </div>
                </div>

                <div className="rounded-[0.8rem] border border-slate-200 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Description
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{detailGroup.description || "-"}</p>
                </div>

                <div className="rounded-[0.8rem] border border-slate-200 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Status
                  </p>
                  <span
                    className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                      detailGroup.status
                    )}`}
                  >
                    {detailGroup.status}
                  </span>
                </div>

                <div className="rounded-[0.8rem] border border-slate-200 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Members
                  </p>
                  <div className="mt-3 max-h-56 space-y-2 overflow-auto pr-1">
                    {detailMembers.length ? (
                      detailMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between rounded-[0.7rem] bg-slate-50 px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-900">{member.name}</p>
                            <p className="text-xs text-slate-500">{member.identification || "-"}</p>
                          </div>
                          <span className="text-xs text-slate-400">{member.group || "No Group"}</span>
                        </div>
                      ))
                    ) : (
                      <p className="py-2 text-sm text-slate-500">No members assigned yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-900">Delete Group</h3>
            <p className="mt-2 text-slate-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deleteTarget.name}</span>? This action cannot be
              undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg px-4 py-2 text-slate-600 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteGroup}
                className="rounded-lg bg-red-600 px-6 py-2 font-medium text-white transition hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
