import { DashboardHomeOverview } from "@/components/dashboard-home-overview"
import { requireSessionUser } from "@/lib/auth"

export default async function DashboardPage() {
  const user = await requireSessionUser()
  const initialNow = new Date().toISOString()

  return <DashboardHomeOverview user={user} initialNow={initialNow} />
}
