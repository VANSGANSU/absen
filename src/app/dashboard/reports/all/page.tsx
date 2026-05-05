import * as React from "react"
import { FileSpreadsheet } from "lucide-react"

export default function AllReportsPage() {
  return (
    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="flex flex-col items-center gap-3">
        <FileSpreadsheet className="size-10 text-slate-300" />
        <h2 className="text-xl font-semibold text-slate-900">All Reports Coming Soon</h2>
        <p className="text-slate-500">We are currently building this feature. Please check back later.</p>
      </div>
    </div>
  )
}


