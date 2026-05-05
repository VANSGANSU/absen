import { requireSessionUser } from "@/lib/auth"
import { AttendanceLocationsOverview } from "@/components/(attendance)/attendance-locations-overview"

export default async function DashboardAttendanceLocationsPage() {
  await requireSessionUser()

  return <AttendanceLocationsOverview />
}
