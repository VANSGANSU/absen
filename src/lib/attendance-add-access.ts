export const ATTENDANCE_ADD_ACCESS_COOKIE = "absensi_attendance_add_access"

export function getAttendanceAddAccessCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  }
}
