import { requireSessionUser } from "@/lib/auth"
import { AttendanceListOverview } from "@/components/(attendance)/attendance-list-overview"

export default async function DashboardAttendanceListPage() {
  await requireSessionUser()

  return <AttendanceListOverview />
}
