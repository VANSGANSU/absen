"use client"

import {
  ChevronsUpDown,
  CreditCardIcon,
  LogOutIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavUser({
  user,
}: {
  user: {
    id?: string
    name: string
    email: string
    avatar: string
    initials?: string
  }
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  // Reuse the existing settings page until a dedicated profile page exists.
  const handleNavigate = (href: string) => {
    router.push(href)
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      })
    } finally {
      router.push("/auth/login")
      router.refresh()
      setIsLoggingOut(false)
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip="Profile (Halaman Pengguna)"
              className="h-auto rounded-2xl py-3 px-2 transition-all data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[state=collapsed]/sidebar:justify-center group-data-[state=collapsed]/sidebar:px-0"
            >
              <Avatar className="h-10 w-10 shrink-0 rounded-full">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-full bg-black text-white">
                  {user.initials ?? "AU"}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight opacity-0 w-0 overflow-hidden whitespace-nowrap transition-all duration-300 group-data-[state=expanded]/sidebar:w-auto group-data-[state=expanded]/sidebar:opacity-100 group-data-[state=expanded]/sidebar:ml-2">
                <span className="truncate text-base font-semibold text-black">
                  {user.name}
                </span>
                <span className="truncate text-sm text-slate-600">
                  {user.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-black shrink-0 opacity-0 w-0 transition-all duration-300 group-data-[state=expanded]/sidebar:w-auto group-data-[state=expanded]/sidebar:opacity-100" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {user.initials ?? "AU"}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => handleNavigate("/dashboard/settings")}>
                <UserIcon className="size-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNavigate("/dashboard/settings#billing")}>
                <CreditCardIcon className="size-4" />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNavigate("/dashboard/settings")}>
                <SettingsIcon className="size-4" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-red-600 focus:bg-red-50 focus:text-red-700"
            >
              <LogOutIcon className="size-4" />
              {isLoggingOut ? "Logging out..." : "Log out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
