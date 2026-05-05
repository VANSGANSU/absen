"use client"

import * as React from "react"
import { ChevronsUpDown, Plus } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { getOrganizationSettings, DEFAULT_SETTINGS, type OrganizationSettings } from "@/lib/organization-store"
 
export function TeamSwitcher({
  teams,
}: {
  teams: {
    name: string
    logo: React.ElementType
    plan: string
  }[]
}) {
  const { isMobile } = useSidebar()
  const [settings, setSettings] = React.useState<OrganizationSettings>(DEFAULT_SETTINGS)
  const [activeTeam, setActiveTeam] = React.useState(teams[0])
 
  React.useEffect(() => {
    // Initial sync with localStorage on mount
    setSettings(getOrganizationSettings())

    const handleUpdate = () => {
      setSettings(getOrganizationSettings())
    }
    window.addEventListener("organization-settings-updated", handleUpdate)
    return () => window.removeEventListener("organization-settings-updated", handleUpdate)
  }, [])

  if (!activeTeam) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip="Workspace"
              className="h-auto rounded-2xl py-3 px-2 transition-all data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[state=collapsed]/sidebar:justify-center group-data-[state=collapsed]/sidebar:px-0"
            >
              <div className="flex h-10 w-10 overflow-hidden items-center justify-center rounded-xl bg-[#d71920] text-white shrink-0 border border-slate-100">
                {settings.logo ? (
                  <img src={settings.logo} alt="Logo" className="size-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center leading-none">
                    <span className="text-2xl font-bold">U</span>
                    <span className="-mt-1 text-[9px] font-bold tracking-[0.18em]">
                      BIG
                    </span>
                  </div>
                )}
              </div>
              <div className="grid flex-1 text-left leading-tight opacity-0 w-0 overflow-hidden whitespace-nowrap transition-all duration-300 group-data-[state=expanded]/sidebar:w-auto group-data-[state=expanded]/sidebar:opacity-100 group-data-[state=expanded]/sidebar:ml-2">
                <span className="truncate text-[1.05rem] font-semibold text-black">
                  {settings.name || activeTeam.name}
                </span>
                <span className="truncate text-sm text-slate-600">
                  {activeTeam.plan}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-black shrink-0 opacity-0 w-0 transition-all duration-300 group-data-[state=expanded]/sidebar:w-auto group-data-[state=expanded]/sidebar:opacity-100" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Teams
            </DropdownMenuLabel>
            {teams.map((team, index) => (
              <DropdownMenuItem
                key={team.name}
                onClick={() => setActiveTeam(team)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <team.logo className="size-3.5 shrink-0" />
                </div>
                {team.name}
                <DropdownMenuShortcut>ALT {index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">Add team</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

