import { Bell, PanelLeft, SunMedium } from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { requireSessionUser } from "@/lib/auth"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSessionUser()

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="relative flex min-h-16 shrink-0 items-center border-b border-slate-200 bg-white py-3">
          <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 hidden h-4 md:block"
              />
              <div className="hidden min-w-0 md:block">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Workspace
                </p>
                <p className="truncate text-sm font-medium text-slate-900">
                  Dashboard panel operasional absensi
                </p>
              </div>
              <div className="block md:hidden">
                <p className="text-sm font-bold text-slate-900">UBIG Absensi</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  className="hidden h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 sm:inline-flex"
                >
                  <PanelLeft className="size-4" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                >
                  <Bell className="size-4" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                >
                  <SunMedium className="size-4" />
                </button>
              </div>
              <div className="hidden text-right md:block">
                <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
            </div>
          </div>
        </header>
        <div className="dashboard-ui flex flex-1 flex-col gap-4 bg-[#fafafa] p-3 pt-5 sm:gap-6 sm:p-6 sm:pt-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
