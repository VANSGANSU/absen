"use client"

import { useParams, useRouter } from "next/navigation"
import { Construction, ArrowLeft } from "lucide-react"

export function SettingsComingSoonPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  // Format slug for display
  const title = slug
    ?.split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 flex size-20 items-center justify-center rounded-[2rem] bg-amber-50 text-amber-500 shadow-sm border border-amber-100">
        <Construction className="size-10" />
      </div>
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-slate-900">
        {title || "Feature"}
      </h1>
      <p className="mb-8 max-w-md text-lg text-slate-500">
        We're currently working hard to bring you the <span className="font-semibold text-slate-700">{title}</span> feature. Stay tuned!
      </p>
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800"
      >
        <ArrowLeft className="size-4" />
        Go Back
      </button>
    </div>
  )
}
