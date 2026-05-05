import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { requireSessionUser } from "@/lib/auth"
import { AttendanceLocationAddOverview } from "@/components/(attendance)/attendance-location-add-overview"
import { LOCATION_ADD_ACCESS_COOKIE } from "@/lib/location-add-access"

export default async function DashboardAttendanceLocationAddPage() {
  await requireSessionUser()

  const cookieStore = await cookies()
  const canAccess = cookieStore.get(LOCATION_ADD_ACCESS_COOKIE)?.value === "allowed"

  if (!canAccess) {
    redirect("/dashboard/attendance/locations")
  }

  return <AttendanceLocationAddOverview initialDate={new Date().toISOString().slice(0, 10)} />
}
