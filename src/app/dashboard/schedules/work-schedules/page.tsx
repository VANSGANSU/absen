import * as React from "react"
import { CalendarDays } from "lucide-react"

export default function WorkSchedulesPage() {
  return (
    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="flex flex-col items-center gap-3">
        <CalendarDays className="size-10 text-slate-300" />
        <h2 className="text-xl font-semibold text-slate-900">Work Schedules Coming Soon</h2>
        <p className="text-slate-500">We are currently building this feature. Please check back later.</p>
      </div>
    </div>
  )
}


