import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { requireSessionUser } from "@/lib/auth"
import {
  ATTENDANCE_ADD_ACCESS_COOKIE,
  getAttendanceAddAccessCookieOptions,
} from "@/lib/attendance-add-access"

export async function POST() {
  await requireSessionUser()

  const cookieStore = await cookies()
  cookieStore.set(
    ATTENDANCE_ADD_ACCESS_COOKIE,
    "allowed",
    getAttendanceAddAccessCookieOptions()
  )

  return NextResponse.json({ ok: true })
}
