import { AttendanceDevicesOverview } from "@/components/(attendance)/attendance-devices-overview"
import { requireSessionUser } from "@/lib/auth"

export default async function DashboardAttendanceDevicesPage() {
  await requireSessionUser()

  return <AttendanceDevicesOverview />
}
