import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AttendanceAddOverview } from "@/components/attendance-add-overview"
import { requireSessionUser } from "@/lib/auth"
import { ATTENDANCE_ADD_ACCESS_COOKIE } from "@/lib/attendance-add-access"

export default async function DashboardAttendanceAddPage() {
  await requireSessionUser()

  const cookieStore = await cookies()
  const canAccess = cookieStore.get(ATTENDANCE_ADD_ACCESS_COOKIE)?.value === "allowed"

  if (!canAccess) {
    redirect("/dashboard/attendance/list")
  }

  return <AttendanceAddOverview initialDate={new Date().toISOString().slice(0, 10)} />
}
