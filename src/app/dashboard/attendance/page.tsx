import { requireSessionUser } from "@/lib/auth"
import { AttendanceDashboardOverview } from "@/components/attendance-dashboard-overview"

export default async function DashboardAttendancePage() {
  await requireSessionUser()
  const initialNow = new Date().toISOString()

  return <AttendanceDashboardOverview initialNow={initialNow} />
}
