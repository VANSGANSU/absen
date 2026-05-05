"use client"

import * as React from "react"
import {
  Download,
  RefreshCw,
  Upload,
  Plus,
  Search,
  ChevronDown,
  Pencil,
  Trash2,
  X,
  Mail,
  User,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import * as XLSX from "xlsx"

import { createClient } from "@/lib/supabase/client"
import {
  fetchGroups,
  fetchMembers,
  updateMember,
  insertMembersBulk,
  type GroupRecord,
  type OrganizationMember,
} from "@/lib/dashboard-data"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"

type Tab = "members" | "invites" | "requests"

export default function MembersPage() {
  const supabase = React.useMemo(() => createClient(), [])
  
  const [activeTab, setActiveTab] = React.useState<Tab>("members")
  const [members, setMembers] = React.useState<OrganizationMember[]>([])
  const [groups, setGroups] = React.useState<GroupRecord[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedGroup, setSelectedGroup] = React.useState("All Groups")
  
  const [isInviteModalOpen, setIsInviteModalOpen] = React.useState(false)

  // Sort state
  const [sortColumn, setSortColumn] = React.useState<string>("name")
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc")

  // Custom Form Select States
  const [inviteRole, setInviteRole] = React.useState("")
  const [inviteDept, setInviteDept] = React.useState("")
  const [invitePos, setInvitePos] = React.useState("")
  
  const [isRoleMenuOpen, setIsRoleMenuOpen] = React.useState(false)
  const [isDeptMenuOpen, setIsDeptMenuOpen] = React.useState(false)
  const [isPosMenuOpen, setIsPosMenuOpen] = React.useState(false)

  // Edit Member States
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [editingMember, setEditingMember] = React.useState<OrganizationMember | null>(null)
  const [editForm, setEditForm] = React.useState({
    name: "",
    identification: "",
    groupId: "",
    gender: "",
    religion: "",
    status: "Active",
  })

  // Refs
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [alert, setAlert] = React.useState<{ type: "success" | "error"; message: string } | null>(null)

  const loadData = React.useCallback(async (retryCount = 0) => {
    setIsLoading(true)
    try {
      const settled = await Promise.allSettled([
        fetchMembers(supabase),
        fetchGroups(supabase),
      ])
      const [memberResult, groupResult] = settled
      if (memberResult.status === "fulfilled") setMembers(memberResult.value)
      else console.warn("Members fetch failed:", memberResult.reason?.message)
      if (groupResult.status === "fulfilled") setGroups(groupResult.value)
      else console.warn("Groups fetch failed:", groupResult.reason?.message)

      const hasNetworkError = settled.some(
        (r) => r.status === "rejected" && r.reason?.message?.includes("Failed to fetch")
      )
      if (hasNetworkError && retryCount < 2) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * (retryCount + 1)))
        return loadData(retryCount + 1)
      }
    } catch (err) {
      console.warn("Members load error:", err)
    } finally {
      setIsLoading(false)
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

  const resolveGroupRecord = React.useCallback(
    (value: string) => {
      const normalized = value.trim().toLowerCase()
      if (!normalized) return undefined
      return (
        groups.find((group) => group.id === value) ??
        groups.find((group) => group.name.toLowerCase() === normalized) ??
        groups.find((group) => group.code.toLowerCase() === normalized) ??
        groups.find((group) => group.name.toLowerCase().includes(normalized))
      )
    },
    [groups]
  )

  const filteredMembers = React.useMemo(() => {
    let result = members.filter((member) => {
      if (selectedGroup !== "All Groups" && member.group !== selectedGroup) return false
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
      
      if (typeof valA === "string") valA = valA.toLowerCase()
      if (typeof valB === "string") valB = valB.toLowerCase()

      if (valA < valB) return sortDirection === "asc" ? -1 : 1
      if (valA > valB) return sortDirection === "asc" ? 1 : -1
      return 0
    })

    return result
  }, [members, selectedGroup, searchQuery, sortColumn, sortDirection])

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

  const handleEdit = (member: OrganizationMember) => {
    setEditingMember(member)
    setEditForm({
      name: member.name,
      identification: member.identification || "",
      groupId: member.groupId || resolveGroupRecord(member.group)?.id || "",
      gender: member.gender || "",
      religion: member.religion || "",
      status: member.status || "Active",
    })
    setIsEditModalOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMember) return

    setIsSaving(true)
    try {
      const nextGroup = editForm.groupId ? resolveGroupRecord(editForm.groupId) : null
      await updateMember(supabase, editingMember.id, {
        name: editForm.name,
        identification: editForm.identification,
        groupId: nextGroup ? nextGroup.id : editingMember.groupId || null,
        group: nextGroup ? nextGroup.name : editingMember.group,
        gender: editForm.gender,
        religion: editForm.religion,
        status: editForm.status,
      })
      await loadData()
      setIsEditModalOpen(false)
      setAlert({ type: "success", message: `Member "${editForm.name}" updated successfully.` })
      setTimeout(() => setAlert(null), 3000)
    } catch (err) {
      console.error("Error updating member:", err)
      setAlert({ type: "error", message: "Failed to update member. Please try again." })
      setTimeout(() => setAlert(null), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleExport = () => {
    const exportData = filteredMembers.map(m => ({
      Name: m.name,
      Identification: m.identification || "",
      Group: m.group || "",
      Gender: m.gender || "",
      Religion: m.religion || ""
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Members")
    
    // Generate filename with current date
    const date = new Date().toISOString().split('T')[0]
    XLSX.writeFile(workbook, `members_export_${date}.xlsx`)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    const reader = new FileReader()
    
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws) as any[]

        if (data.length === 0) {
          setAlert({ type: "error", message: "The file is empty or in an invalid format." })
          setTimeout(() => setAlert(null), 3000)
          setIsLoading(false)
          return
        }

        // Map columns (fuzzy matching for common headers)
        const mappedMembers = data.map(row => {
          const findVal = (keys: string[]) => {
            const foundKey = Object.keys(row).find(k => 
              keys.some(search => k.toLowerCase().includes(search.toLowerCase()))
            )
            return foundKey ? row[foundKey] : ""
          }

          const nextGroup = resolveGroupRecord(String(findVal(["group", "dept", "grup", "divisi", "division"]) || ""))

          return {
            name: findVal(["name", "nama", "full name"]),
            identification: String(findVal(["id", "identification", "identitas", "no", "nik"]) || ""),
            group: nextGroup?.name || String(findVal(["group", "dept", "grup", "divisi", "division"]) || ""),
            groupId: nextGroup?.id || null,
            gender: findVal(["gender", "kelamin", "sex"]),
            religion: findVal(["religion", "agama"])
          }
        }).filter(m => m.name) // Filter out rows without a name

        if (mappedMembers.length === 0) {
          setAlert({ type: "error", message: "No valid member data found. Please ensure headers like 'Name' or 'Nama' exist." })
          setTimeout(() => setAlert(null), 3000)
          setIsLoading(false)
          return
        }

        await insertMembersBulk(supabase, mappedMembers)
        await loadData()
        setAlert({ type: "success", message: `${mappedMembers.length} member(s) imported successfully.` })
        setTimeout(() => setAlert(null), 3000)
      } catch (err) {
        console.error("Import error:", err)
        setAlert({ type: "error", message: "Failed to import members. Please check the file format." })
        setTimeout(() => setAlert(null), 3000)
      } finally {
        setIsLoading(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    }

    reader.readAsBinaryString(file)
  }
  return (
    <div className="flex min-h-[calc(100vh-theme(spacing.16))] flex-col bg-white">
      {/* --- ALERT NOTIFIKASI --- */}
      {alert && (
        <div className="px-8 pt-6">
          <Alert className={`max-w-md ${alert.type === "error" ? "border-red-200 bg-red-50" : ""}`}>
            {alert.type === "success" ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
            <AlertTitle>{alert.type === "success" ? "Success" : "Error"}</AlertTitle>
            <AlertDescription>{alert.message}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* --- HEADER: Judul Halaman & Status Onboarding --- */}
      <div className="border-b border-slate-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Members</h1>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-2">
              <User className="size-4" />
              Onboarding status
            </span>
          </div>
        </div>


        {/* --- TABS: Pemilihan tampilan (Members, Invites, Requests) --- */}
        <div className="mt-8 flex gap-8 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("members")}
            className={`pb-4 text-sm font-semibold transition ${
              activeTab === "members"
                ? "border-b-2 border-black text-black"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            MEMBERS ({members.length})
          </button>
          <button
            onClick={() => setActiveTab("invites")}
            className={`pb-4 text-sm font-semibold transition ${
              activeTab === "invites"
                ? "border-b-2 border-black text-black"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            INVITES (0)
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`pb-4 text-sm font-semibold transition ${
              activeTab === "requests"
                ? "border-b-2 border-black text-black"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            JOIN REQUESTS
          </button>
        </div>
      </div>

      <div className="flex-1 px-8 py-6">
        {activeTab === "members" && (
          <div className="space-y-6">
            {/* --- TOOLBAR: Pencarian, Filter Grup, Export/Import, Invite --- */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-1 items-center gap-4">
                <div className="relative max-w-sm flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search members..."
                    className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-slate-300"
                  />
                </div>
                <div className="relative">
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="appearance-none rounded-lg border border-slate-200 py-2.5 pl-4 pr-10 text-sm font-medium outline-none transition focus:border-slate-300"
                  >
                    {groupOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={handleExport}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Download className="size-4" />
                  Export
                </button>
                <button
                  onClick={() => void loadData()}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  disabled={isLoading}
                >
                  <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
                <button 
                  onClick={handleImportClick}
                  disabled={isLoading}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Upload className="size-4" />
                  Import
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImportFile}
                  accept=".xlsx, .xls, .csv"
                  className="hidden" 
                />
                <button
                  onClick={() => setIsInviteModalOpen(true)}
                  className="flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-900"
                >
                  <Plus className="size-4" />
                  Invite
                </button>
              </div>
            </div>


            {/* --- TABEL MEMBER: Daftar semua anggota organisasi --- */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-none overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[50rem] text-left text-sm">
                  <thead className="bg-transparent border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-4">
                        <button onClick={() => handleSort('name')} className="flex items-center gap-2 hover:text-black transition">
                          NAME {renderSortIcon('name')}
                        </button>
                      </th>
                      <th className="px-6 py-4">
                        <button onClick={() => handleSort('identification')} className="flex items-center gap-2 hover:text-black transition">
                          IDENTIFICATION {renderSortIcon('identification')}
                        </button>
                      </th>
                      <th className="px-6 py-4">
                        <button onClick={() => handleSort('group')} className="flex items-center gap-2 hover:text-black transition">
                          GROUP {renderSortIcon('group')}
                        </button>
                      </th>
                      <th className="px-6 py-4">
                        <button onClick={() => handleSort('gender')} className="flex items-center gap-2 hover:text-black transition">
                          GENDER {renderSortIcon('gender')}
                        </button>
                      </th>
                      <th className="px-6 py-4">
                        <button onClick={() => handleSort('religion')} className="flex items-center gap-2 hover:text-black transition">
                          RELIGION {renderSortIcon('religion')}
                        </button>
                      </th>
                      <th className="px-6 py-4">
                        <button onClick={() => handleSort('status')} className="flex items-center gap-2 hover:text-black transition">
                          STATUS {renderSortIcon('status')}
                        </button>
                      </th>
                      <th className="px-6 py-4 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                          Memuat data...
                        </td>
                      </tr>
                    ) : filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                          No members found.
                        </td>
                      </tr>
                    ) : (
                      filteredMembers.map((member) => (
                        <tr key={member.id} className="border-b border-slate-100 last:border-0 text-slate-700">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-500 uppercase">
                                {member.initials || member.name.charAt(0)}
                              </div>
                              <span className="font-medium text-slate-900">{member.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-900 font-medium whitespace-nowrap">
                            {member.identification || "-"}
                          </td>
                          <td className="px-6 py-4">
                            <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
                              {member.group || "-"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{member.gender || "-"}</td>
                          <td className="px-6 py-4 text-slate-600">{member.religion || "-"}</td>
                          <td className="px-6 py-4">
                            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                              member.status === "Inactive" 
                                ? "border-slate-200 bg-slate-50 text-slate-600" 
                                : "border-green-200 bg-green-50 text-green-700"
                            }`}>
                              {member.status || "Active"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => handleEdit(member)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                              >
                                <Pencil className="size-4" />
                              </button>
                              <button className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition">
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "invites" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search invites"
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-slate-300"
                />
              </div>
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-900"
              >
                <Plus className="size-4" />
                Invite
              </button>
            </div>
            
            <div className="rounded-lg bg-white shadow-none overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="bg-transparent border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-4">MEMBER</th>
                      <th className="px-6 py-4">ROLE</th>
                      <th className="px-6 py-4">TEAMS</th>
                      <th className="px-6 py-4">PROJECTS</th>
                      <th className="px-6 py-4">PAYMENT</th>
                      <th className="px-6 py-4">WEEKLY LIMIT</th>
                      <th className="px-6 py-4">STATUS</th>
                      <th className="px-6 py-4 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center text-sm text-slate-500">
                        No invitations found.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "requests" && (
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50">
            <p className="text-slate-500">No join requests at the moment.</p>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-[420px] rounded-2xl bg-white shadow-2xl">
            <div className="px-6 py-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Invite New Member</h2>
                  <p className="mt-1 text-sm text-slate-500">Send email invitation.</p>
                </div>
                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div>
                  <label className="mb-2 block text-[0.9rem] font-semibold text-slate-900">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 size-4.5 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      placeholder="email@example.com"
                      className="w-full rounded-[0.55rem] border border-slate-200 py-[0.6rem] pl-10 pr-4 text-sm outline-none transition focus:border-slate-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[0.9rem] font-semibold text-slate-900">Role (Optional)</label>
                  <div className="relative w-[160px]">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRoleMenuOpen(!isRoleMenuOpen)
                        setIsDeptMenuOpen(false)
                        setIsPosMenuOpen(false)
                      }}
                      className="flex w-full items-center justify-between rounded-[0.55rem] border border-slate-200 bg-white py-[0.6rem] pl-4 pr-3 text-sm text-slate-700 outline-none transition focus:border-slate-300"
                    >
                      <span className={inviteRole ? "text-slate-900" : "text-slate-500"}>
                        {inviteRole || "Select role"}
                      </span>
                      <ChevronDown className="size-4 text-slate-400" />
                    </button>
                    {isRoleMenuOpen && (
                      <div className="absolute top-[calc(100%+4px)] left-0 z-50 w-[180px] overflow-hidden rounded-lg border border-slate-100 bg-white py-1.5 shadow-xl">
                        {["Client", "Member", "Petugas", "User"].map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setInviteRole(opt)
                              setIsRoleMenuOpen(false)
                            }}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-800 transition hover:bg-slate-50 hover:text-black"
                          >
                            <User className="size-4.5 text-slate-600" strokeWidth={1.5} />
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_1fr] gap-4">
                  <div>
                    <label className="mb-2 block text-[0.9rem] font-semibold text-slate-900">Dept (Optional)</label>
                    <div className="relative w-[120px]">
                      <button
                        type="button"
                        onClick={() => {
                          setIsDeptMenuOpen(!isDeptMenuOpen)
                          setIsRoleMenuOpen(false)
                          setIsPosMenuOpen(false)
                        }}
                        className="flex w-full items-center justify-between rounded-[0.55rem] border border-slate-200 bg-white py-[0.6rem] pl-4 pr-3 text-sm text-slate-700 outline-none transition focus:border-slate-300"
                      >
                        <span className={inviteDept ? "text-slate-900" : "text-slate-500"}>
                          {inviteDept || "Dept"}
                        </span>
                        <ChevronDown className="size-4 text-slate-400" />
                      </button>
                      {isDeptMenuOpen && (
                        <div className="absolute top-[calc(100%+4px)] left-0 z-50 w-[160px] max-h-48 overflow-y-auto overflow-hidden rounded-lg border border-slate-100 bg-white py-1.5 shadow-xl">
                          {groups.length === 0 ? (
                            <p className="px-4 py-2.5 text-sm text-slate-400 italic">No groups found</p>
                          ) : groups.map((g) => (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => {
                                setInviteDept(g.name)
                                setIsDeptMenuOpen(false)
                              }}
                              className="flex w-full items-center px-4 py-2.5 text-sm text-slate-800 hover:bg-slate-50 hover:text-black"
                            >
                              {g.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-[0.9rem] font-semibold text-slate-900">Pos (Optional)</label>
                    <div className="relative w-[110px]">
                      <button
                        type="button"
                        onClick={() => {
                          setIsPosMenuOpen(!isPosMenuOpen)
                          setIsRoleMenuOpen(false)
                          setIsDeptMenuOpen(false)
                        }}
                        className="flex w-full items-center justify-between rounded-[0.55rem] border border-slate-200 bg-white py-[0.6rem] pl-4 pr-3 text-sm text-slate-700 outline-none transition focus:border-slate-300"
                      >
                        <span className={invitePos ? "text-slate-900" : "text-slate-500"}>
                          {invitePos || "Pos"}
                        </span>
                        <ChevronDown className="size-4 text-slate-400" />
                      </button>
                      {isPosMenuOpen && (
                        <div className="absolute top-[calc(100%+4px)] left-0 z-50 w-[140px] overflow-hidden rounded-lg border border-slate-100 bg-white py-1.5 shadow-xl">
                          {["admin"].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                setInvitePos(opt)
                                setIsPosMenuOpen(false)
                              }}
                              className="flex w-full items-center px-4 py-2.5 text-sm text-slate-800 transition hover:bg-slate-50 hover:text-black"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[0.9rem] font-semibold text-slate-900">Message (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Welcome to the team!"
                    className="w-full rounded-[0.55rem] border border-slate-200 p-3 text-sm outline-none transition focus:border-slate-300"
                  ></textarea>
                </div>

                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="mt-2 w-full rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-900"
                >
                  Send Invitation
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-[420px] rounded-2xl bg-white shadow-2xl">
            <div className="px-6 py-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Edit Member</h2>
                  <p className="mt-1 text-sm text-slate-500">Update member information.</p>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleUpdate}>
                <div>
                  <label className="mb-2 block text-[0.9rem] font-semibold text-slate-900">Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full rounded-[0.55rem] border border-slate-200 py-[0.6rem] px-4 text-sm outline-none transition focus:border-slate-300"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[0.9rem] font-semibold text-slate-900">Identification</label>
                  <input
                    type="text"
                    value={editForm.identification}
                    onChange={(e) => setEditForm({ ...editForm, identification: e.target.value })}
                    className="w-full rounded-[0.55rem] border border-slate-200 py-[0.6rem] px-4 text-sm outline-none transition focus:border-slate-300"
                    placeholder="e.g. 3507..."
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[0.9rem] font-semibold text-slate-900">Group / Dept</label>
                  <select
                    value={editForm.groupId}
                    onChange={(e) => setEditForm({ ...editForm, groupId: e.target.value })}
                    className="w-full rounded-[0.55rem] border border-slate-200 bg-white py-[0.6rem] px-3 text-sm outline-none transition focus:border-slate-300"
                  >
                    <option value="">Select group</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-[0.9rem] font-semibold text-slate-900">Gender</label>
                    <select 
                      value={editForm.gender}
                      onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                      className="w-full rounded-[0.55rem] border border-slate-200 bg-white py-[0.6rem] px-3 text-sm outline-none transition focus:border-slate-300"
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-[0.9rem] font-semibold text-slate-900">Religion</label>
                    <select 
                      value={editForm.religion}
                      onChange={(e) => setEditForm({ ...editForm, religion: e.target.value })}
                      className="w-full rounded-[0.55rem] border border-slate-200 bg-white py-[0.6rem] px-3 text-sm outline-none transition focus:border-slate-300"
                    >
                      <option value="">Select</option>
                      <option value="Islam">Islam</option>
                      <option value="Kristen">Kristen</option>
                      <option value="Katholik">Katholik</option>
                      <option value="Hindu">Hindu</option>
                      <option value="Budha">Budha</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[0.9rem] font-semibold text-slate-900">Status</label>
                  <select 
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full rounded-[0.55rem] border border-slate-200 bg-white py-[0.6rem] px-3 text-sm outline-none transition focus:border-slate-300"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="mt-2 w-full rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
