"use client"

import * as React from "react"

type MemberStatus = "Active" | "Field" | "Leave"

type TeamMember = {
  id: string
  name: string
  role: string
  division: string
  status: MemberStatus
  shift: string
}

const STORAGE_KEY = "absensi-team-members"

const defaultMembers: TeamMember[] = [
  {
    id: "EMP-001",
    name: "Demo Absensi",
    role: "Operator",
    division: "Operations",
    status: "Active",
    shift: "08:00 - 17:00",
  },
  {
    id: "EMP-002",
    name: "Alya Putri",
    role: "HR Specialist",
    division: "Human Capital",
    status: "Active",
    shift: "08:00 - 17:00",
  },
  {
    id: "EMP-003",
    name: "Rizky Pratama",
    role: "Finance Admin",
    division: "Finance",
    status: "Active",
    shift: "09:00 - 18:00",
  },
  {
    id: "EMP-004",
    name: "Nadia Permata",
    role: "Supervisor",
    division: "Field Operations",
    status: "Field",
    shift: "07:00 - 16:00",
  },
  {
    id: "EMP-005",
    name: "Dimas Saputra",
    role: "Staff Support",
    division: "Operations",
    status: "Leave",
    shift: "08:00 - 17:00",
  },
]

const statusOptions: MemberStatus[] = ["Active", "Field", "Leave"]

function createEmptyForm() {
  return {
    id: "",
    name: "",
    role: "",
    division: "Operations",
    status: "Active" as MemberStatus,
    shift: "08:00 - 17:00",
  }
}

export default function DashboardTeamPage() {
  const [members, setMembers] = React.useState<TeamMember[]>(defaultMembers)
  const [keyword, setKeyword] = React.useState("")
  const [selectedDivision, setSelectedDivision] = React.useState("All Divisions")
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [message, setMessage] = React.useState("")
  const [form, setForm] = React.useState(createEmptyForm())

  React.useEffect(() => {
    const storedMembers = window.localStorage.getItem(STORAGE_KEY)

    if (!storedMembers) {
      return
    }

    try {
      const parsedMembers = JSON.parse(storedMembers) as TeamMember[]
      if (parsedMembers.length) {
        setMembers(parsedMembers)
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  React.useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(members))
  }, [members])

  const divisions = [
    "All Divisions",
    ...Array.from(new Set(members.map((member) => member.division))),
  ]

  const filteredMembers = members.filter((member) => {
    const keywordMatches = [member.name, member.role, member.id]
      .join(" ")
      .toLowerCase()
      .includes(keyword.toLowerCase())
    const divisionMatches =
      selectedDivision === "All Divisions" || member.division === selectedDivision

    return keywordMatches && divisionMatches
  })

  const resetForm = () => {
    setForm(createEmptyForm())
    setEditingId(null)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.name.trim() || !form.role.trim() || !form.division.trim()) {
      setMessage("Lengkapi nama, role, dan divisi terlebih dahulu.")
      return
    }

    if (editingId) {
      setMembers((current) =>
        current.map((member) =>
          member.id === editingId
            ? {
                ...member,
                name: form.name.trim(),
                role: form.role.trim(),
                division: form.division.trim(),
                status: form.status,
                shift: form.shift.trim(),
              }
            : member
        )
      )
      setMessage(`Data karyawan ${form.name.trim()} berhasil diperbarui.`)
      resetForm()
      return
    }

    const newId = `EMP-${String(members.length + 1).padStart(3, "0")}`
    setMembers((current) => [
      {
        id: newId,
        name: form.name.trim(),
        role: form.role.trim(),
        division: form.division.trim(),
        status: form.status,
        shift: form.shift.trim(),
      },
      ...current,
    ])
    setMessage(`Karyawan ${form.name.trim()} berhasil ditambahkan.`)
    resetForm()
  }

  const handleEdit = (member: TeamMember) => {
    setEditingId(member.id)
    setForm(member)
    setMessage(`Sedang mengedit data ${member.name}.`)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-black bg-white p-4 sm:p-6">
        <p className="text-sm font-medium text-black">Team Directory</p>
        <h1 className="mt-2 text-2xl font-semibold text-black sm:text-3xl">Struktur Tim Operasional</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-black">
          Halaman ini sekarang bisa dipakai untuk mencari karyawan, memfilter per divisi, dan melihat pembagian role serta shift operasional absensi.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.75rem] border border-black bg-white p-4 sm:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-black">Cari Karyawan</span>
              <input
                type="text"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Nama, role, atau ID karyawan"
                className="h-12 w-full rounded-2xl border border-black px-4 outline-none transition focus:ring-2 focus:ring-black"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-black">Filter Divisi</span>
              <select
                value={selectedDivision}
                onChange={(event) => setSelectedDivision(event.target.value)}
                className="h-12 w-full rounded-2xl border border-black px-4 outline-none transition focus:ring-2 focus:ring-black"
              >
                {divisions.map((division) => (
                  <option key={division} value={division}>
                    {division}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {message ? (
            <div className="mt-4 rounded-2xl border border-black px-4 py-3 text-sm text-black">
              {message}
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <article className="rounded-[1.75rem] border border-black bg-black p-5 text-white">
            <p className="text-sm">Total Anggota</p>
            <p className="mt-3 text-3xl font-semibold">{filteredMembers.length}</p>
          </article>
          <article className="rounded-[1.75rem] border border-black bg-white p-5">
            <p className="text-sm text-black">Divisi Aktif</p>
            <p className="mt-3 text-3xl font-semibold text-black">{new Set(filteredMembers.map((member) => member.division)).size}</p>
          </article>
          <article className="rounded-[1.75rem] border border-black bg-white p-5">
            <p className="text-sm text-black">Status Lapangan</p>
            <p className="mt-3 text-3xl font-semibold text-black">{filteredMembers.filter((member) => member.status === "Field").length}</p>
          </article>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-black bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-black">Form Karyawan</p>
            <h2 className="mt-2 text-2xl font-semibold text-black">
              {editingId ? "Edit Data Karyawan" : "Tambah Karyawan Baru"}
            </h2>
          </div>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl border border-black bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-black hover:text-white"
            >
              Batal Edit
            </button>
          ) : null}
        </div>

        <form className="mt-6 grid gap-4 lg:grid-cols-2" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-black">
              Nama
            </span>
            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              className="h-12 w-full rounded-2xl border border-black px-4 outline-none transition focus:ring-2 focus:ring-black"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-black">
              Role
            </span>
            <input
              type="text"
              value={form.role}
              onChange={(event) =>
                setForm((current) => ({ ...current, role: event.target.value }))
              }
              className="h-12 w-full rounded-2xl border border-black px-4 outline-none transition focus:ring-2 focus:ring-black"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-black">
              Divisi
            </span>
            <input
              type="text"
              value={form.division}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  division: event.target.value,
                }))
              }
              className="h-12 w-full rounded-2xl border border-black px-4 outline-none transition focus:ring-2 focus:ring-black"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-black">
              Status
            </span>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as MemberStatus,
                }))
              }
              className="h-12 w-full rounded-2xl border border-black px-4 outline-none transition focus:ring-2 focus:ring-black"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="block lg:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-black">
              Shift
            </span>
            <input
              type="text"
              value={form.shift}
              onChange={(event) =>
                setForm((current) => ({ ...current, shift: event.target.value }))
              }
              placeholder="Contoh: 08:00 - 17:00"
              className="h-12 w-full rounded-2xl border border-black px-4 outline-none transition focus:ring-2 focus:ring-black"
            />
          </label>
          <div className="lg:col-span-2 flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-2xl border border-black bg-black px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {editingId ? "Simpan Perubahan" : "Tambah Karyawan"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl border border-black bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-black hover:text-white"
            >
              Reset Form
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredMembers.map((member) => (
          <article key={member.id} className="rounded-[1.75rem] border border-black bg-white p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-black bg-black text-lg font-semibold text-white">
                {member.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
              </div>
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${member.status === "Active" ? "border-black bg-black text-white" : "border-black bg-white text-black"}`}>
                {member.status}
              </span>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-black">{member.name}</h2>
            <p className="mt-1 text-sm text-black">{member.role}</p>
            <div className="mt-5 space-y-2 text-sm text-black">
              <p>ID: {member.id}</p>
              <p>Divisi: {member.division}</p>
              <p>Shift: {member.shift}</p>
            </div>
            <button
              type="button"
              onClick={() => handleEdit(member)}
              className="mt-5 rounded-2xl border border-black bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-black hover:text-white"
            >
              Edit Karyawan
            </button>
          </article>
        ))}
      </section>
    </div>
  )
}
