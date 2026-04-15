"use client"

import {
  AlarmClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CopyPlus,
  LoaderCircle,
  Plus,
  Rows3,
  Save,
  TimerReset,
  Trash2,
} from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"

type AttendanceStatus = "Hadir" | "Terlambat" | "Izin" | "Sakit" | "WFH"
type AttendanceInputStatus = "Auto" | AttendanceStatus
type EntrySource = "manual-single" | "manual-batch" | "schedule"

type ScheduleItem = {
  id: string
  label: string
  start: string
  end: string
  status: AttendanceStatus
}

type AttendanceRecord = {
  id: string
  date: string
  time: string
  status: AttendanceStatus
  note: string
  source: EntrySource
  statusDetail?: string
  scheduleLabel?: string
}

type MonthlyRecapRow = {
  id: string
  name: string
  division: string
  counts: Record<AttendanceStatus, number>
  total: number
  source: "live" | "sample"
}

type BatchRow = {
  id: string
  date: string
  time: string
  status: AttendanceInputStatus
  note: string
}

type ManualAttendanceWorkspaceProps = {
  user: {
    id: string
    name: string
    email: string
  }
}

const STATUS_OPTIONS: AttendanceStatus[] = [
  "Hadir",
  "Terlambat",
  "Izin",
  "Sakit",
  "WFH",
]

const INPUT_STATUS_OPTIONS: AttendanceInputStatus[] = [
  "Auto",
  ...STATUS_OPTIONS,
]

const DEFAULT_SCHEDULES: ScheduleItem[] = [
  {
    id: "schedule-morning-checkin",
    label: "Check-in Pagi",
    start: "08:00",
    end: "09:00",
    status: "Hadir",
  },
  {
    id: "schedule-evening-checkout",
    label: "Check-out Sore",
    start: "17:00",
    end: "18:00",
    status: "Hadir",
  },
]

const TEAM_MONTHLY_RECAP_SEED = [
  {
    id: "employee-02",
    name: "Alya Putri",
    division: "Human Capital",
    counts: {
      Hadir: 19,
      Terlambat: 2,
      Izin: 1,
      Sakit: 0,
      WFH: 2,
    },
  },
  {
    id: "employee-03",
    name: "Rizky Pratama",
    division: "Finance",
    counts: {
      Hadir: 18,
      Terlambat: 1,
      Izin: 0,
      Sakit: 1,
      WFH: 3,
    },
  },
  {
    id: "employee-04",
    name: "Nadia Permata",
    division: "Operations",
    counts: {
      Hadir: 20,
      Terlambat: 0,
      Izin: 1,
      Sakit: 0,
      WFH: 2,
    },
  },
] satisfies Array<{
  id: string
  name: string
  division: string
  counts: Record<AttendanceStatus, number>
}>

function formatDateInput(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function formatTimeInput(date = new Date()) {
  return date.toTimeString().slice(0, 5)
}

function formatMonthInput(date = new Date()) {
  return date.toISOString().slice(0, 7)
}

function createEmptyBatchRow(): BatchRow {
  return {
    id: crypto.randomUUID(),
    date: formatDateInput(),
    time: formatTimeInput(),
    status: "Auto",
    note: "",
  }
}

function addDays(baseDate: Date, offset: number) {
  const nextDate = new Date(baseDate)
  nextDate.setDate(nextDate.getDate() + offset)
  return nextDate
}

function minutesFromTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number)
  return hours * 60 + minutes
}

function getCurrentTimeLabel() {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date())
}

function getMonthLabel(value: string) {
  const [year, month] = value.split("-").map(Number)

  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1))
}

function resolveAttendanceStatus({
  selectedStatus,
  time,
  schedules,
}: {
  selectedStatus: AttendanceInputStatus
  time: string
  schedules: ScheduleItem[]
}) {
  if (selectedStatus !== "Auto") {
    return {
      status: selectedStatus,
      detail: `Status dipilih manual sebagai ${selectedStatus}.`,
    }
  }

  const entryMinutes = minutesFromTime(time)
  const matchingSchedule =
    schedules.find((schedule) => entryMinutes <= minutesFromTime(schedule.end)) ??
    schedules[0]

  if (matchingSchedule) {
    const startMinutes = minutesFromTime(matchingSchedule.start)
    const graceMinutes = startMinutes + 15

    if (matchingSchedule.label.toLowerCase().includes("check-in")) {
      if (entryMinutes <= graceMinutes) {
        return {
          status: "Hadir" as const,
          detail: `Status otomatis Hadir karena absen masih dalam toleransi check-in ${matchingSchedule.start}.`,
          scheduleLabel: matchingSchedule.label,
        }
      }

      return {
        status: "Terlambat" as const,
        detail: `Status otomatis Terlambat karena melewati toleransi 15 menit dari ${matchingSchedule.start}.`,
        scheduleLabel: matchingSchedule.label,
      }
    }

    return {
      status: "Hadir" as const,
      detail: `Status otomatis mengikuti schedule ${matchingSchedule.label}.`,
      scheduleLabel: matchingSchedule.label,
    }
  }

  return entryMinutes <= minutesFromTime("08:15")
    ? {
        status: "Hadir" as const,
        detail: "Status otomatis Hadir karena check-in sebelum 08:15.",
      }
    : {
        status: "Terlambat" as const,
        detail: "Status otomatis Terlambat karena check-in setelah 08:15.",
      }
}

function createSeedRecords(schedules: ScheduleItem[]): AttendanceRecord[] {
  const today = new Date()

  return [
    {
      id: crypto.randomUUID(),
      date: formatDateInput(addDays(today, 0)),
      time: "08:07",
      status: "Hadir",
      note: "Check-in pagi dari kantor pusat.",
      source: "manual-single",
      statusDetail: "Status otomatis Hadir karena absen masih dalam toleransi.",
      scheduleLabel: schedules[0]?.label,
    },
    {
      id: crypto.randomUUID(),
      date: formatDateInput(addDays(today, -1)),
      time: "08:28",
      status: "Terlambat",
      note: "Terlambat karena meeting eksternal sebelum masuk kantor.",
      source: "manual-batch",
      statusDetail: "Status otomatis Terlambat karena melewati toleransi check-in.",
      scheduleLabel: schedules[0]?.label,
    },
    {
      id: crypto.randomUUID(),
      date: formatDateInput(addDays(today, -2)),
      time: "08:00",
      status: "WFH",
      note: "WFH untuk koordinasi vendor dan sinkronisasi laporan harian.",
      source: "manual-single",
      statusDetail: "Status dipilih manual sebagai WFH.",
    },
    {
      id: crypto.randomUUID(),
      date: formatDateInput(addDays(today, -3)),
      time: "07:56",
      status: "Hadir",
      note: "Quick absen mengikuti jadwal check-in pagi.",
      source: "schedule",
      statusDetail: "Status otomatis mengikuti schedule aktif.",
      scheduleLabel: schedules[0]?.label,
    },
    {
      id: crypto.randomUUID(),
      date: formatDateInput(addDays(today, -4)),
      time: "08:00",
      status: "Sakit",
      note: "Izin sakit dan lampiran surat dokter telah diunggah.",
      source: "manual-batch",
      statusDetail: "Status dipilih manual sebagai Sakit.",
    },
  ]
}

function getStatusTone(status: AttendanceStatus) {
  switch (status) {
    case "Hadir":
      return "bg-black text-white border-black"
    case "Terlambat":
      return "bg-white text-black border-black"
    case "Izin":
      return "bg-black text-white border-black"
    case "Sakit":
      return "bg-white text-black border-black"
    case "WFH":
      return "bg-black text-white border-black"
  }
}

export function ManualAttendanceWorkspace({
  user,
}: ManualAttendanceWorkspaceProps) {
  const storageKey = `absensi-records:${user.id}`
  const scheduleStorageKey = `absensi-schedules:${user.id}`

  const [records, setRecords] = React.useState<AttendanceRecord[]>([])
  const [schedules, setSchedules] = React.useState<ScheduleItem[]>(DEFAULT_SCHEDULES)
  const [singleEntry, setSingleEntry] = React.useState({
    date: formatDateInput(),
    time: formatTimeInput(),
    status: "Auto" as AttendanceInputStatus,
    note: "",
  })
  const [batchEntries, setBatchEntries] = React.useState<BatchRow[]>([
    createEmptyBatchRow(),
  ])
  const [message, setMessage] = React.useState<{
    tone: "success" | "warning"
    text: string
  } | null>(null)
  const [selectedMonth, setSelectedMonth] = React.useState(formatMonthInput())
  const [currentClock, setCurrentClock] = React.useState(getCurrentTimeLabel())
  const [isQuickSubmitting, setIsQuickSubmitting] = React.useState(false)

  React.useEffect(() => {
    const storedRecords = window.localStorage.getItem(storageKey)
    const storedSchedules = window.localStorage.getItem(scheduleStorageKey)

    if (storedRecords) {
      try {
        const parsedRecords = JSON.parse(storedRecords) as AttendanceRecord[]
        setRecords(
          parsedRecords.length ? parsedRecords : createSeedRecords(DEFAULT_SCHEDULES)
        )
      } catch {
        window.localStorage.removeItem(storageKey)
      }
    } else {
      setRecords(createSeedRecords(DEFAULT_SCHEDULES))
    }

    if (storedSchedules) {
      try {
        setSchedules(JSON.parse(storedSchedules) as ScheduleItem[])
      } catch {
        window.localStorage.removeItem(scheduleStorageKey)
      }
    }
  }, [scheduleStorageKey, storageKey])

  React.useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(records))
  }, [records, storageKey])

  React.useEffect(() => {
    window.localStorage.setItem(scheduleStorageKey, JSON.stringify(schedules))
  }, [scheduleStorageKey, schedules])

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentClock(getCurrentTimeLabel())
    }, 1000)

    return () => window.clearInterval(interval)
  }, [])

  const activeSchedule = (() => {
    const now = new Date()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()

    return schedules.find((schedule) => {
      const startMinutes = minutesFromTime(schedule.start)
      const endMinutes = minutesFromTime(schedule.end)

      return nowMinutes >= startMinutes && nowMinutes <= endMinutes
    })
  })()

  const addRecord = (incoming: AttendanceRecord[]) => {
    setRecords((current) => [...incoming, ...current])
  }

  const handleSingleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const resolved = resolveAttendanceStatus({
      selectedStatus: singleEntry.status,
      time: singleEntry.time,
      schedules,
    })

    addRecord([
      {
        id: crypto.randomUUID(),
        date: singleEntry.date,
        time: singleEntry.time,
        status: resolved.status,
        note: singleEntry.note.trim(),
        source: "manual-single",
        statusDetail: resolved.detail,
        scheduleLabel: resolved.scheduleLabel,
      },
    ])

    setMessage({
      tone: "success",
      text: `Absen manual single berhasil disimpan dengan status ${resolved.status}.`,
    })
    setSingleEntry((current) => ({
      ...current,
      note: "",
      status: "Auto",
      time: formatTimeInput(),
    }))
  }

  const handleBatchSubmit = () => {
    const validRows = batchEntries.filter((row) => row.date && row.time)

    if (!validRows.length) {
      setMessage({
        tone: "warning",
        text: "Isi minimal satu baris batch dengan tanggal dan waktu yang valid.",
      })
      return
    }

    addRecord(
      validRows.map((row) => {
        const resolved = resolveAttendanceStatus({
          selectedStatus: row.status,
          time: row.time,
          schedules,
        })

        return {
          id: crypto.randomUUID(),
          date: row.date,
          time: row.time,
          status: resolved.status,
          note: row.note.trim(),
          source: "manual-batch" as const,
          statusDetail: resolved.detail,
          scheduleLabel: resolved.scheduleLabel,
        }
      })
    )

    setBatchEntries([createEmptyBatchRow()])
    setMessage({
      tone: "success",
      text: `${validRows.length} data absen batch berhasil disimpan dengan status yang sudah disesuaikan.`,
    })
  }

  const handleQuickAttendance = async () => {
    if (!activeSchedule) {
      setMessage({
        tone: "warning",
        text: "Tombol quick absen hanya aktif saat waktu sekarang masuk range schedule.",
      })
      return
    }

    setIsQuickSubmitting(true)
    const quickTime = formatTimeInput()
    const quickStatus = resolveAttendanceStatus({
      selectedStatus: "Auto",
      time: quickTime,
      schedules,
    })

    addRecord([
      {
        id: crypto.randomUUID(),
        date: formatDateInput(),
        time: quickTime,
        status: quickStatus.status,
        note: `Absen mengikuti schedule ${activeSchedule.label}`,
        source: "schedule",
        scheduleLabel: activeSchedule.label,
        statusDetail: quickStatus.detail,
      },
    ])

    setMessage({
      tone: "success",
      text: `Quick absen untuk ${activeSchedule.label} berhasil disimpan dengan status ${quickStatus.status}.`,
    })

    window.setTimeout(() => setIsQuickSubmitting(false), 300)
  }

  const updateBatchEntry = (
    id: string,
    field: keyof Omit<BatchRow, "id">,
    value: string
  ) => {
    setBatchEntries((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    )
  }

  const removeBatchEntry = (id: string) => {
    setBatchEntries((current) =>
      current.length === 1 ? current : current.filter((row) => row.id !== id)
    )
  }

  const todayRecordCount = (() => {
    const today = formatDateInput()
    return records.filter((record) => record.date === today).length
  })()

  const batchReadyCount = batchEntries.filter((row) => row.date && row.time).length
  const singleStatusPreview = resolveAttendanceStatus({
    selectedStatus: singleEntry.status,
    time: singleEntry.time,
    schedules,
  })
  const monthlyRecords = records.filter((record) =>
    record.date.startsWith(selectedMonth)
  )
  const statusSummary = STATUS_OPTIONS.map((status) => ({
    status,
    count: records.filter((record) => record.status === status).length,
  }))
  const currentUserMonthlyRecap: MonthlyRecapRow = {
    id: user.id,
    name: user.name,
    division: "Karyawan aktif",
    counts: {
      Hadir: monthlyRecords.filter((record) => record.status === "Hadir").length,
      Terlambat: monthlyRecords.filter((record) => record.status === "Terlambat")
        .length,
      Izin: monthlyRecords.filter((record) => record.status === "Izin").length,
      Sakit: monthlyRecords.filter((record) => record.status === "Sakit").length,
      WFH: monthlyRecords.filter((record) => record.status === "WFH").length,
    },
    total: monthlyRecords.length,
    source: "live",
  }
  const monthlyRecapRows: MonthlyRecapRow[] = [
    currentUserMonthlyRecap,
    ...TEAM_MONTHLY_RECAP_SEED.map((employee) => ({
      ...employee,
      total: Object.values(employee.counts).reduce((sum, count) => sum + count, 0),
      source: "sample" as const,
    })),
  ]

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.75rem] border border-black bg-white p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium text-black">Manual Attendance</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-black">
                Absen manual + schedule dalam satu workspace
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-black">
                Opsi 3 aktif: user bisa absen manual single, absen batch, dan
                juga quick absen berbasis schedule jika waktu sekarang masuk ke
                range yang ditentukan.
              </p>
            </div>

            <div className="rounded-3xl bg-black px-5 py-4 text-white">
              <p className="text-xs uppercase tracking-[0.22em] text-white">
                Clock
              </p>
              <p className="mt-2 text-3xl font-semibold">{currentClock}</p>
              <p className="mt-2 text-sm text-white">{user.name}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <article className="rounded-3xl border border-black bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl border border-black bg-black p-3 text-white">
                  <CheckCircle2 className="size-5" />
                </span>
                <div>
                  <p className="text-sm text-black">Absen Hari Ini</p>
                  <p className="text-3xl font-semibold text-black">
                    {todayRecordCount}
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-3xl border border-black bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl border border-black bg-black p-3 text-white">
                  <Rows3 className="size-5" />
                </span>
                <div>
                  <p className="text-sm text-black">Batch Siap Submit</p>
                  <p className="text-3xl font-semibold text-black">
                    {batchReadyCount}
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-3xl border border-black bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl border border-black bg-black p-3 text-white">
                  <AlarmClock className="size-5" />
                </span>
                <div>
                  <p className="text-sm text-black">Quick Schedule</p>
                  <p className="text-lg font-semibold text-black">
                    {activeSchedule ? activeSchedule.label : "Menunggu range aktif"}
                  </p>
                </div>
              </div>
            </article>
          </div>
        </div>

        <aside className="rounded-[1.75rem] border border-black bg-black p-4 text-white sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">Schedule Quick Absen</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                Tombol aktif sesuai range jadwal
              </h3>
            </div>
            <TimerReset className="size-6 text-white" />
          </div>

          <div className="mt-6 space-y-3">
            {schedules.map((schedule) => {
              const scheduleIsActive = activeSchedule?.id === schedule.id

              return (
                <div
                  key={schedule.id}
                  className={cn(
                    "rounded-3xl border px-4 py-4 transition",
                    scheduleIsActive
                      ? "border-white bg-white text-black"
                      : "border-white bg-black text-white"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{schedule.label}</p>
                      <p className="mt-1 text-sm">
                        {schedule.start} - {schedule.end}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-semibold",
                        scheduleIsActive
                          ? "border-black bg-black text-white"
                          : "border-white bg-white text-black"
                      )}
                    >
                      {schedule.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={handleQuickAttendance}
            disabled={!activeSchedule || isQuickSubmitting}
            className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-white bg-white px-4 text-lg font-semibold text-black transition enabled:hover:bg-black enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isQuickSubmitting ? (
              <LoaderCircle className="size-5 animate-spin" />
            ) : (
              <Clock3 className="size-5" />
            )}
            {activeSchedule
              ? `Absen Sekarang (${activeSchedule.label})`
              : "Tombol aktif saat range schedule berjalan"}
          </button>

          <p className="mt-4 text-sm leading-6 text-white">
            Jika sedang di luar range schedule, user tetap bisa melakukan absen
            manual single atau batch di panel sebelah.
          </p>
        </aside>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {statusSummary.map((item) => (
          <article
            key={item.status}
            className="rounded-3xl border border-black bg-white p-4"
          >
            <span
              className={cn(
                "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                getStatusTone(item.status)
              )}
            >
              {item.status}
            </span>
            <p className="mt-4 text-3xl font-semibold text-black">{item.count}</p>
            <p className="mt-1 text-sm text-black">Total riwayat status</p>
          </article>
        ))}
      </section>

      <section className="rounded-[1.75rem] border border-black bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-black">
              Rekap Bulanan Per Karyawan
            </h3>
            <p className="text-sm text-black">
              Baris akun yang sedang login dihitung langsung dari data absen,
              sedangkan baris lain disiapkan sebagai data contoh tim.
            </p>
          </div>

          <div className="w-full max-w-xs">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-black">
                Bulan Rekap
              </span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="h-12 w-full rounded-2xl border border-black px-4 outline-none transition focus:ring-2 focus:ring-black"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:hidden">
          {monthlyRecapRows.map((row) => (
            <article
              key={`${row.id}-mobile`}
              className="rounded-3xl border border-black bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-black">{row.name}</p>
                  <p className="text-sm text-black">{row.division}</p>
                  <p className="mt-1 text-sm text-black">{getMonthLabel(selectedMonth)}</p>
                </div>
                <span
                  className={cn(
                    "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                    row.source === "live"
                      ? "border-black bg-black text-white"
                      : "border-black bg-white text-black"
                  )}
                >
                  {row.source === "live" ? "Live" : "Sample"}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-black">
                <p>Hadir: {row.counts.Hadir}</p>
                <p>Terlambat: {row.counts.Terlambat}</p>
                <p>Izin: {row.counts.Izin}</p>
                <p>Sakit: {row.counts.Sakit}</p>
                <p>WFH: {row.counts.WFH}</p>
                <p className="font-semibold">Total: {row.total}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 hidden overflow-x-auto rounded-3xl border border-black lg:block">
          <div className="min-w-[920px] grid-cols-[1.5fr_1fr_0.8fr_0.8fr_0.7fr_0.7fr_0.7fr_0.9fr_0.9fr] bg-black px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white lg:grid">
            <span>Karyawan</span>
            <span>Divisi</span>
            <span>Hadir</span>
            <span>Terlambat</span>
            <span>Izin</span>
            <span>Sakit</span>
            <span>WFH</span>
            <span>Total</span>
            <span>Sumber</span>
          </div>

          <div className="min-w-[920px] divide-y divide-black bg-white">
            {monthlyRecapRows.map((row) => (
              <div
                key={row.id}
                className="grid gap-3 px-4 py-4 lg:grid-cols-[1.5fr_1fr_0.8fr_0.8fr_0.7fr_0.7fr_0.7fr_0.9fr_0.9fr] lg:items-center"
              >
                <div>
                  <p className="font-semibold text-black">{row.name}</p>
                  <p className="text-sm text-black">{getMonthLabel(selectedMonth)}</p>
                </div>
                <div className="text-sm text-black">{row.division}</div>
                <div className="text-sm font-medium text-black">{row.counts.Hadir}</div>
                <div className="text-sm font-medium text-black">
                  {row.counts.Terlambat}
                </div>
                <div className="text-sm font-medium text-black">{row.counts.Izin}</div>
                <div className="text-sm font-medium text-black">{row.counts.Sakit}</div>
                <div className="text-sm font-medium text-black">{row.counts.WFH}</div>
                <div className="text-sm font-semibold text-black">{row.total}</div>
                <div>
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                      row.source === "live"
                        ? "border-black bg-black text-white"
                        : "border-black bg-white text-black"
                    )}
                  >
                    {row.source === "live" ? "Live" : "Sample"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {message ? (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm font-medium",
            message.tone === "success"
              ? "border-black bg-black text-white"
              : "border-black bg-white text-black"
          )}
        >
          {message.text}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[1.75rem] border border-black bg-white p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl border border-black bg-black p-3 text-white">
              <Save className="size-5" />
            </span>
            <div>
              <h3 className="text-xl font-semibold text-black">
                Manual Single Submit
              </h3>
              <p className="text-sm text-black">
                Isi tanggal, waktu, status, lalu submit satu data absen.
              </p>
            </div>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSingleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-black">
                  Tanggal
                </span>
                <input
                  type="date"
                  value={singleEntry.date}
                  onChange={(event) =>
                    setSingleEntry((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                  className="h-12 w-full rounded-2xl border border-black px-4 outline-none transition focus:ring-2 focus:ring-black"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-black">
                  Waktu
                </span>
                <input
                  type="time"
                  value={singleEntry.time}
                  onChange={(event) =>
                    setSingleEntry((current) => ({
                      ...current,
                      time: event.target.value,
                    }))
                  }
                  className="h-12 w-full rounded-2xl border border-black px-4 outline-none transition focus:ring-2 focus:ring-black"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-black">
                Status
              </span>
              <select
                value={singleEntry.status}
                onChange={(event) =>
                  setSingleEntry((current) => ({
                    ...current,
                    status: event.target.value as AttendanceInputStatus,
                  }))
                }
                className="h-12 w-full rounded-2xl border border-black px-4 outline-none transition focus:ring-2 focus:ring-black"
              >
                {INPUT_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-black">
                Preview status:{" "}
                <span className="font-semibold">{singleStatusPreview.status}</span>
              </p>
              <p className="mt-1 text-sm text-black">
                {singleStatusPreview.detail}
              </p>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-black">
                Catatan
              </span>
              <textarea
                value={singleEntry.note}
                onChange={(event) =>
                  setSingleEntry((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                rows={4}
                placeholder="Opsional: catatan untuk absen manual"
                className="w-full rounded-2xl border border-black px-4 py-3 outline-none transition focus:ring-2 focus:ring-black"
              />
            </label>

            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-black px-5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <Save className="size-4" />
              Submit Single
            </button>
          </form>
        </article>

        <article className="rounded-[1.75rem] border border-black bg-white p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="rounded-2xl border border-black bg-black p-3 text-white">
                <CopyPlus className="size-5" />
              </span>
              <div>
                <h3 className="text-xl font-semibold text-black">
                  Batch Manual Submit
                </h3>
                <p className="text-sm text-black">
                  Tambahkan beberapa baris sekaligus lalu submit batch.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setBatchEntries((current) => [...current, createEmptyBatchRow()])}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-black px-4 text-sm font-semibold text-black transition hover:bg-black hover:text-white"
            >
              <Plus className="size-4" />
              Tambah Baris
            </button>
          </div>

          <div className="mt-6 space-y-4">
            {batchEntries.map((row, index) => (
              <div
                key={row.id}
                className="rounded-3xl border border-black bg-white p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold text-black">
                    Baris {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeBatchEntry(row.id)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-black transition hover:bg-black hover:text-white"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1.4fr]">
                  <input
                    type="date"
                    value={row.date}
                    onChange={(event) =>
                      updateBatchEntry(row.id, "date", event.target.value)
                    }
                    className="h-11 rounded-2xl border border-black bg-white px-4 outline-none transition focus:ring-2 focus:ring-black"
                  />
                  <input
                    type="time"
                    value={row.time}
                    onChange={(event) =>
                      updateBatchEntry(row.id, "time", event.target.value)
                    }
                    className="h-11 rounded-2xl border border-black bg-white px-4 outline-none transition focus:ring-2 focus:ring-black"
                  />
                  <select
                    value={row.status}
                    onChange={(event) =>
                      updateBatchEntry(row.id, "status", event.target.value)
                    }
                    className="h-11 rounded-2xl border border-black bg-white px-4 outline-none transition focus:ring-2 focus:ring-black"
                  >
                    {INPUT_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={row.note}
                    onChange={(event) =>
                      updateBatchEntry(row.id, "note", event.target.value)
                    }
                    placeholder="Catatan"
                    className="h-11 rounded-2xl border border-black bg-white px-4 outline-none transition focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleBatchSubmit}
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-black px-5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Rows3 className="size-4" />
            Submit Batch
          </button>
        </article>
      </section>

      <section className="rounded-[1.75rem] border border-black bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-black">Riwayat Absen Manual</h3>
            <p className="text-sm text-black">
              Semua hasil dari single submit, batch submit, dan quick schedule tampil di sini.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setRecords([])
              setMessage({
                tone: "success",
                text: "Riwayat absen manual berhasil dikosongkan.",
              })
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-black px-4 text-sm font-semibold text-black transition hover:bg-black hover:text-white"
          >
            <Trash2 className="size-4" />
            Kosongkan Riwayat
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:hidden">
          {records.length ? (
            records.map((record) => (
              <article
                key={`${record.id}-mobile`}
                className="rounded-3xl border border-black bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-black">{record.date}</p>
                    <p className="text-sm text-black">{record.time}</p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                      getStatusTone(record.status)
                    )}
                  >
                    {record.status}
                  </span>
                </div>
                <p className="mt-4 text-sm font-medium capitalize text-black">
                  {record.source.replace("-", " ")}
                </p>
                <p className="mt-2 break-words text-sm text-black">
                  {[record.note, record.statusDetail, record.scheduleLabel]
                    .filter(Boolean)
                    .join(" | ") || "-"}
                </p>
              </article>
            ))
          ) : (
            <div className="rounded-3xl border border-black px-4 py-10 text-center text-sm text-black">
              Belum ada data absen manual. Coba submit single, batch, atau quick
              absen dari schedule.
            </div>
          )}
        </div>

        <div className="mt-6 hidden overflow-x-auto rounded-3xl border border-black md:block">
          <div className="min-w-[860px] grid-cols-[1.1fr_0.8fr_0.9fr_0.9fr_1.6fr] bg-black px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white md:grid">
            <span>Tanggal</span>
            <span>Waktu</span>
            <span>Status</span>
            <span>Sumber</span>
            <span>Catatan</span>
          </div>

          <div className="min-w-[860px] divide-y divide-black bg-white">
            {records.length ? (
              records.map((record) => (
                <div
                  key={record.id}
                  className="grid gap-3 px-4 py-4 md:grid-cols-[1.1fr_0.8fr_0.9fr_0.9fr_1.6fr] md:items-center"
                >
                  <div className="flex items-center gap-2 text-sm text-black">
                    <CalendarDays className="size-4 text-black" />
                    {record.date}
                  </div>
                  <div className="text-sm text-black">{record.time}</div>
                  <div>
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                        getStatusTone(record.status)
                      )}
                    >
                      {record.status}
                    </span>
                  </div>
                  <div className="text-sm font-medium capitalize text-black">
                    {record.source.replace("-", " ")}
                  </div>
                  <div className="break-words text-sm text-black">
                    {[record.note, record.statusDetail, record.scheduleLabel]
                      .filter(Boolean)
                      .join(" | ") || "-"}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-10 text-center text-sm text-black">
                Belum ada data absen manual. Coba submit single, batch, atau quick absen dari schedule.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
