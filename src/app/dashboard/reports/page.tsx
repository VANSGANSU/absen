"use client"

import * as React from "react"

type ReportRow = {
  id: string
  employee: string
  division: string
  month: string
  type: string
  hadir: number
  terlambat: number
  wfh: number
  status: "Ready" | "Review" | "Archived"
}

const reportRows: ReportRow[] = [
  {
    id: "RPT-001",
    employee: "Demo Absensi",
    division: "Operations",
    month: "2026-03",
    type: "Manual Attendance Export",
    hadir: 18,
    terlambat: 2,
    wfh: 1,
    status: "Ready",
  },
  {
    id: "RPT-002",
    employee: "Alya Putri",
    division: "Human Capital",
    month: "2026-03",
    type: "Late Arrival Report",
    hadir: 19,
    terlambat: 1,
    wfh: 2,
    status: "Ready",
  },
  {
    id: "RPT-003",
    employee: "Rizky Pratama",
    division: "Finance",
    month: "2026-03",
    type: "Division Attendance Snapshot",
    hadir: 17,
    terlambat: 3,
    wfh: 2,
    status: "Review",
  },
  {
    id: "RPT-004",
    employee: "Nadia Permata",
    division: "Field Operations",
    month: "2026-02",
    type: "Manual Attendance Export",
    hadir: 20,
    terlambat: 0,
    wfh: 3,
    status: "Archived",
  },
]

const reportTypes = [
  "All Reports",
  "Manual Attendance Export",
  "Late Arrival Report",
  "Division Attendance Snapshot",
]

function escapeCsvValue(value: string | number) {
  const normalized = String(value).replaceAll('"', '""')
  return `"${normalized}"`
}

export default function DashboardReportsPage() {
  const [selectedMonth, setSelectedMonth] = React.useState("2026-03")
  const [selectedType, setSelectedType] = React.useState("All Reports")
  const [message, setMessage] = React.useState("")

  const filteredRows = reportRows.filter((row) => {
    const monthMatches = row.month === selectedMonth
    const typeMatches = selectedType === "All Reports" || row.type === selectedType
    return monthMatches && typeMatches
  })

  const totalLateCases = filteredRows.reduce((sum, row) => sum + row.terlambat, 0)
  const totalWFH = filteredRows.reduce((sum, row) => sum + row.wfh, 0)
  const totalReady = filteredRows.filter((row) => row.status === "Ready").length

  const downloadFile = (
    content: string,
    fileName: string,
    mimeType: string
  ) => {
    const blob = new Blob([content], { type: mimeType })
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = objectUrl
    anchor.download = fileName
    anchor.click()
    URL.revokeObjectURL(objectUrl)
  }

  const handleExportCsv = () => {
    if (!filteredRows.length) {
      setMessage("Tidak ada data yang bisa diexport untuk filter saat ini.")
      return
    }

    const headers = [
      "ID",
      "Employee",
      "Division",
      "Month",
      "Report Type",
      "Hadir",
      "Terlambat",
      "WFH",
      "Status",
    ]
    const lines = [
      headers.map((header) => escapeCsvValue(header)).join(","),
      ...filteredRows.map((row) =>
        [
          row.id,
          row.employee,
          row.division,
          row.month,
          row.type,
          row.hadir,
          row.terlambat,
          row.wfh,
          row.status,
        ]
          .map((value) => escapeCsvValue(value))
          .join(",")
      ),
    ]

    downloadFile(
      lines.join("\n"),
      `absensi-report-${selectedMonth}.csv`,
      "text/csv;charset=utf-8"
    )
    setMessage("CSV berhasil diunduh dari data laporan yang sedang difilter.")
  }

  const handleExportSummary = () => {
    const summary = [
      `Ringkasan Laporan Absensi`,
      `Bulan: ${selectedMonth}`,
      `Jenis laporan: ${selectedType}`,
      `Jumlah laporan siap: ${totalReady}`,
      `Total kasus terlambat: ${totalLateCases}`,
      `Total WFH: ${totalWFH}`,
      `Jumlah baris data: ${filteredRows.length}`,
    ].join("\n")

    downloadFile(
      summary,
      `absensi-summary-${selectedMonth}.txt`,
      "text/plain;charset=utf-8"
    )
    setMessage("Summary laporan berhasil diunduh dalam format teks.")
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-black bg-white p-4 sm:p-6">
        <p className="text-sm font-medium text-black">Reports</p>
        <h1 className="mt-2 text-2xl font-semibold text-black sm:text-3xl">Pusat Laporan Absensi</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-black">
          Halaman ini sekarang bisa difilter per bulan dan tipe laporan. Operator bisa memakai bagian ini untuk membaca snapshot data sebelum nantinya diekspor ke CSV atau Excel.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.75rem] border border-black bg-white p-4 sm:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-black">Bulan Laporan</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="h-12 w-full rounded-2xl border border-black px-4 outline-none transition focus:ring-2 focus:ring-black"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-black">Jenis Laporan</span>
              <select
                value={selectedType}
                onChange={(event) => setSelectedType(event.target.value)}
                className="h-12 w-full rounded-2xl border border-black px-4 outline-none transition focus:ring-2 focus:ring-black"
              >
                {reportTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExportCsv}
              className="rounded-2xl border border-black bg-black px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={handleExportSummary}
              className="rounded-2xl border border-black bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-black hover:text-white"
            >
              Download Summary
            </button>
          </div>

          {message ? (
            <div className="mt-4 rounded-2xl border border-black bg-white px-4 py-3 text-sm text-black">
              {message}
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <article className="rounded-[1.75rem] border border-black bg-black p-5 text-white">
            <p className="text-sm">Laporan Siap</p>
            <p className="mt-3 text-3xl font-semibold">{totalReady}</p>
          </article>
          <article className="rounded-[1.75rem] border border-black bg-white p-5">
            <p className="text-sm text-black">Kasus Terlambat</p>
            <p className="mt-3 text-3xl font-semibold text-black">{totalLateCases}</p>
          </article>
          <article className="rounded-[1.75rem] border border-black bg-white p-5">
            <p className="text-sm text-black">Total WFH</p>
            <p className="mt-3 text-3xl font-semibold text-black">{totalWFH}</p>
          </article>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-black bg-white">
        <div className="grid gap-4 p-4 xl:hidden">
          {filteredRows.length ? (
            filteredRows.map((row) => (
              <article key={`${row.id}-mobile`} className="rounded-3xl border border-black bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-black">{row.employee}</p>
                    <p className="text-sm text-black">{row.id} | {row.month}</p>
                  </div>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${row.status === "Ready" ? "border-black bg-black text-white" : "border-black bg-white text-black"}`}>
                    {row.status}
                  </span>
                </div>
                <p className="mt-4 text-sm text-black">{row.division}</p>
                <p className="mt-1 text-sm text-black">{row.type}</p>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm text-black">
                  <p>Hadir: {row.hadir}</p>
                  <p>Terlambat: {row.terlambat}</p>
                  <p>WFH: {row.wfh}</p>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-3xl border border-black px-4 py-10 text-center text-sm text-black">
              Tidak ada laporan untuk filter yang dipilih.
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto xl:block">
        <div className="min-w-[980px] grid-cols-[0.9fr_1.2fr_1fr_1.2fr_0.7fr_0.7fr_0.7fr_0.8fr] bg-black px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white xl:grid">
          <span>ID</span>
          <span>Karyawan</span>
          <span>Divisi</span>
          <span>Tipe</span>
          <span>Hadir</span>
          <span>Terlambat</span>
          <span>WFH</span>
          <span>Status</span>
        </div>
        <div className="min-w-[980px] divide-y divide-black">
          {filteredRows.length ? (
            filteredRows.map((row) => (
              <div key={row.id} className="grid gap-3 px-4 py-4 xl:grid-cols-[0.9fr_1.2fr_1fr_1.2fr_0.7fr_0.7fr_0.7fr_0.8fr] xl:items-center">
                <div className="text-sm font-semibold text-black">{row.id}</div>
                <div>
                  <p className="font-semibold text-black">{row.employee}</p>
                  <p className="text-sm text-black">{row.month}</p>
                </div>
                <div className="text-sm text-black">{row.division}</div>
                <div className="text-sm text-black">{row.type}</div>
                <div className="text-sm font-medium text-black">{row.hadir}</div>
                <div className="text-sm font-medium text-black">{row.terlambat}</div>
                <div className="text-sm font-medium text-black">{row.wfh}</div>
                <div>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${row.status === "Ready" ? "border-black bg-black text-white" : "border-black bg-white text-black"}`}>
                    {row.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-10 text-center text-sm text-black">
              Tidak ada laporan untuk filter yang dipilih.
            </div>
          )}
        </div>
        </div>
      </section>
    </div>
  )
}
