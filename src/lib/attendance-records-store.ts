export type AttendanceStatus = "Present" | "Late" | "Absent" | "Excused"

export type AttendanceRecordEntry = {
  id: string
  memberId: string
  memberName: string
  memberDepartment: string
  date: string
  checkIn: string | null
  breakIn: string | null
  breakOut: string | null
  checkOut: string | null
  status: AttendanceStatus
  workHours: string | null
}

export const ATTENDANCE_RECORDS_STORAGE_KEY = "absensi.attendance.records"

export function computeWorkHours(
  checkIn: string | null,
  checkOut: string | null
): string | null {
  if (!checkIn || !checkOut) return null

  const [inH, inM] = checkIn.split(":").map(Number)
  const [outH, outM] = checkOut.split(":").map(Number)

  const totalMinutes = outH * 60 + outM - (inH * 60 + inM)

  if (totalMinutes <= 0) return null

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
}

export function computeStatus(checkIn: string | null): AttendanceStatus {
  if (!checkIn) return "Absent"

  const [h, m] = checkIn.split(":").map(Number)
  const totalMinutes = h * 60 + m

  // Batas terlambat: 08:16 (setelah 15 menit toleransi dari 08:01)
  const lateThreshold = 8 * 60 + 16

  return totalMinutes <= lateThreshold ? "Present" : "Late"
}

export function loadAttendanceRecords(): AttendanceRecordEntry[] {
  if (typeof window === "undefined") return []

  const stored = window.localStorage.getItem(ATTENDANCE_RECORDS_STORAGE_KEY)
  if (!stored) return []

  try {
    return JSON.parse(stored) as AttendanceRecordEntry[]
  } catch {
    return []
  }
}

export function persistAttendanceRecords(records: AttendanceRecordEntry[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(
    ATTENDANCE_RECORDS_STORAGE_KEY,
    JSON.stringify(records)
  )
}
