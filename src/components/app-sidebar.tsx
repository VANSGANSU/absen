"use client"

import * as React from "react"
import { AudioWaveform, Command, GalleryVerticalEnd } from "lucide-react"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { dashboardNavigation } from "@/lib/dashboard-navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// This is sample data.
const data = {
  teams: [
    {
      name: "MAGANG UBIG",
      logo: GalleryVerticalEnd,
      plan: "Offline",
    },
    {
      name: "Timesheet Ops",
      logo: AudioWaveform,
      plan: "Review",
    },
    {
      name: "Field Team",
      logo: Command,
      plan: "Shift",
    },
  ],
}

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: {
    id: string
    name: string
    email: string
    avatar: string
    initials: string
  }
}) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={dashboardNavigation} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
