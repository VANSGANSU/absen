"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, type LucideIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    items?: {
      title: string
      url: string
      icon?: LucideIcon
    }[]
  }[]
}) {
  const pathname = usePathname()
  const { isMobile, closeSidebar } = useSidebar()

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          const hasChildren = Boolean(item.items?.length)
          const isActive =
            pathname === item.url ||
            item.items?.some((subItem) => pathname === subItem.url)

          return (
            <Collapsible
              key={item.title}
              defaultOpen={isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                {hasChildren ? (
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={pathname === item.url}
                      tooltip={item.title}
                      className="h-11 rounded-xl px-3 text-base font-medium"
                    >
                      {item.icon ? <item.icon className="size-5" /> : null}
                      <span>{item.title}</span>
                      <ChevronDown className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                ) : (
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.title}
                    className="h-11 rounded-xl px-3 text-base font-medium"
                  >
                    <Link href={item.url} onClick={() => isMobile && closeSidebar()}>
                      {item.icon ? <item.icon className="size-5" /> : null}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                )}

                {hasChildren ? (
                  <CollapsibleContent>
                    <SidebarMenuSub className="ml-5 mt-2 gap-1 border-l border-slate-200 pl-3">
                      {item.items?.map((subItem) => {
                        const subActive = pathname === subItem.url

                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              className={`h-10 rounded-xl px-3 text-[0.97rem] ${
                                subActive
                                  ? "bg-slate-100 font-medium text-slate-900"
                                  : "text-slate-700"
                              }`}
                            >
                              <Link
                                href={subItem.url}
                                onClick={() => isMobile && closeSidebar()}
                              >
                                {subItem.icon ? (
                                  <subItem.icon className="mr-3 size-4" />
                                ) : null}
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                ) : null}
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
