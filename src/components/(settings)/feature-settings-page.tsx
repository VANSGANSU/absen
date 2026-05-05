"use client"

import * as React from "react"
import Link from "next/link"
import {
  Search,
  Briefcase,
  Users,
  Calendar,
  Activity,
  Lightbulb,
  FileText,
} from "lucide-react"

type SettingItem = {
  label: string
  href: string
}

type SettingCategory = {
  title: string
  icon: React.ElementType
  badge?: string
  items: SettingItem[]
}

const SETTINGS_DATA: SettingCategory[] = [
  {
    title: "Project",
    icon: Briefcase,
    items: [
      { label: "Projects & tasks", href: "/dashboard/configuration/projects-tasks" },
    ],
  },
  {
    title: "Members",
    icon: Users,
    items: [
      { label: "E-mail notifications", href: "/dashboard/configuration/notifications" },
      { label: "Work time limits", href: "/dashboard/configuration/work-time-limits" },
      { label: "Payments", href: "/dashboard/configuration/payments" },
      { label: "Achievements", href: "/dashboard/configuration/achievements" },
      { label: "Custom fields", href: "/dashboard/configuration/custom-fields" },
    ],
  },
  {
    title: "Schedules",
    icon: Calendar,
    items: [
      { label: "Calendar", href: "/dashboard/configuration/calendar" },
      { label: "Job sites", href: "/dashboard/configuration/job-sites" },
      { label: "Map", href: "/dashboard/configuration/map" },
    ],
  },
  {
    title: "Activity & tracking",
    icon: Activity,
    items: [
      { label: "Activity", href: "/dashboard/configuration/activity" },
      { label: "Timesheets", href: "/dashboard/configuration/timesheets" },
      { label: "Time & tracking", href: "/dashboard/configuration/time-tracking" },
      { label: "Screenshots", href: "/dashboard/configuration/screenshots" },
    ],
  },
  {
    title: "Insights",
    icon: Lightbulb,
    badge: "Add-on",
    items: [
      { label: "Apps/URLs classifications", href: "/dashboard/configuration/classifications" },
    ],
  },
  {
    title: "Policies",
    icon: FileText,
    items: [
      { label: "Time off", href: "/dashboard/configuration/time-off" },
      { label: "Breaks", href: "/dashboard/configuration/breaks" },
      { label: "Overtime", href: "/dashboard/configuration/overtime" },
    ],
  },
]

export function FeatureSettingsPage() {
  const [searchQuery, setSearchQuery] = React.useState("")

  const filteredData = SETTINGS_DATA.filter((category) => {
    const matchesTitle = category.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesItems = category.items.some((item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
    return matchesTitle || matchesItems
  })

  return (
    <div className="flex flex-col space-y-8 p-6 sm:p-8">
      {/* Header with Divider */}
      <div className="border-b border-slate-300 pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Settings
          </h1>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings"
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-4 text-sm outline-none transition focus:border-slate-300 placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Grid - More Compact */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredData.map((category) => (
          <div
            key={category.title}
            className="flex flex-col rounded-xl border border-slate-100 bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <category.icon className="size-5 text-slate-400" />
                <h2 className="text-base font-semibold text-slate-900">{category.title}</h2>
              </div>
              {category.badge && (
                <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-slate-600 border border-slate-100">
                  {category.badge}
                </span>
              )}
            </div>

            <div className="mt-5 flex flex-col space-y-2.5">
              {category.items.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-[0.85rem] font-medium text-slate-500 transition hover:text-slate-900 hover:underline inline-flex items-center"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredData.length === 0 && (
        <div className="flex h-64 flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-slate-50/50">
          <p className="text-slate-500">No settings found matching your search.</p>
        </div>
      )}
    </div>
  )
}
