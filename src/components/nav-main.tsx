"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import * as React from "react"
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

type NavItem = {
  title: string
  url: string
  icon?: LucideIcon
  items?: {
    title: string
    url: string
    icon?: LucideIcon
  }[]
}

// Flyout panel shown when collapsed sidebar icon is clicked (for items with children)
function CollapsedFlyout({
  item,
  anchorRef,
  onClose,
}: {
  item: NavItem
  anchorRef: React.RefObject<HTMLElement | null>
  onClose: () => void
}) {
  const pathname = usePathname()
  const flyoutRef = React.useRef<HTMLDivElement>(null)
  const [top, setTop] = React.useState(0)

  // Position flyout next to the anchor element
  React.useLayoutEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect()
      setTop(rect.top)
    }
  }, [anchorRef])

  // Close on click outside
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        flyoutRef.current &&
        !flyoutRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [onClose, anchorRef])

  // Close on Escape
  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [onClose])

  return (
    <div
      ref={flyoutRef}
      style={{ top }}
      className="fixed left-[62px] z-[99999] min-w-[200px] overflow-hidden rounded-[12px] border border-slate-200 !bg-white opacity-100 p-1 shadow-2xl animate-in fade-in slide-in-from-left-1 duration-200"
    >
      {/* Header label */}
      <div className="border-b border-slate-100 px-3 py-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          {item.title}
        </p>
      </div>
      {/* Sub items */}
      <div className="py-1">
        {item.items?.map((subItem) => {
          const subActive = pathname === subItem.url
          return (
            <Link
              key={subItem.title}
              href={subItem.url}
              onClick={onClose}
              className={`flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors hover:bg-slate-50 ${
                subActive
                  ? "font-semibold text-slate-900"
                  : "font-medium text-slate-600 hover:text-slate-900"
              }`}
            >
              {subItem.icon ? (
                <subItem.icon className="size-3.5 shrink-0 text-slate-400" />
              ) : (
                <span className="size-1.5 shrink-0 rounded-full bg-slate-300" />
              )}
              {subItem.title}
              {subActive && (
                <span className="ml-auto size-1.5 rounded-full bg-slate-900" />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// Individual nav item — handles both expanded and collapsed states
function NavItem({ item }: { item: NavItem }) {
  const pathname = usePathname()
  const { open: sidebarOpen, isMobile, closeSidebar } = useSidebar()
  const isCollapsed = !sidebarOpen && !isMobile

  const hasChildren = Boolean(item.items?.length)
  const isActive =
    pathname === item.url ||
    item.items?.some((subItem) => pathname === subItem.url)

  // Flyout state for collapsed mode
  const [flyoutOpen, setFlyoutOpen] = React.useState(false)
  const buttonRef = React.useRef<HTMLLIElement>(null)

  const handleCollapsedClick = React.useCallback((e: React.MouseEvent) => {
    if (hasChildren) {
      e.preventDefault()
      e.stopPropagation()
      setFlyoutOpen((prev) => !prev)
    }
  }, [hasChildren])

  const closeFlyout = React.useCallback(() => setFlyoutOpen(false), [])

  // Collapsed mode: show icon-only with tooltip + flyout
  if (isCollapsed) {
    return (
      <SidebarMenuItem ref={buttonRef}>
        <div className="group/collapsed-item relative">
          {hasChildren ? (
            <button
              type="button"
              onClick={handleCollapsedClick}
              data-active={isActive}
              className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-slate-100 ${
                flyoutOpen
                  ? "bg-slate-100"
                  : isActive
                  ? "bg-slate-100"
                  : ""
              }`}
            >
              {item.icon ? (
                <item.icon
                  className={`size-5 shrink-0 ${
                    isActive ? "text-slate-900" : "text-slate-500"
                  }`}
                />
              ) : null}
            </button>
          ) : (
            <Link
              href={item.url}
              className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-slate-100 ${
                isActive ? "bg-slate-100" : ""
              }`}
            >
              {item.icon ? (
                <item.icon
                  className={`size-5 shrink-0 ${
                    isActive ? "text-slate-900" : "text-slate-500"
                  }`}
                />
              ) : null}
            </Link>
          )}

          {/* Hover Tooltip — hidden when flyout is open */}
          {!flyoutOpen && (
            <span
              className="
                pointer-events-none fixed left-[62px] z-[9999]
                hidden whitespace-nowrap rounded-[8px]
                bg-slate-900 px-3 py-1.5 text-[12px]
                font-semibold text-white shadow-xl
                group-hover/collapsed-item:block
              "
              style={{ marginTop: "-1.4rem" }}
            >
              {item.title}
              <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-y-[5px] border-y-transparent border-r-[6px] border-r-slate-900" />
            </span>
          )}
        </div>

        {/* Flyout panel for items with children */}
        {flyoutOpen && hasChildren && (
          <CollapsedFlyout
            item={item}
            anchorRef={buttonRef}
            onClose={closeFlyout}
          />
        )}
      </SidebarMenuItem>
    )
  }

  // Expanded mode: full sidebar item with collapsible sub-menu
  return (
    <Collapsible
      defaultOpen={isActive}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        {hasChildren ? (
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              isActive={pathname === item.url}
              className="h-11 rounded-xl px-3 text-base font-medium transition-all"
            >
              {item.icon ? <item.icon className="size-5 shrink-0" /> : null}
              <span className="ml-2">{item.title}</span>
              <ChevronDown className="ml-auto size-4 transition-all duration-300 group-data-[state=open]/collapsible:rotate-180" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
        ) : (
          <SidebarMenuButton
            asChild
            isActive={isActive}
            className="h-11 rounded-xl px-3 text-base font-medium transition-all"
          >
            <Link href={item.url} onClick={() => isMobile && closeSidebar()}>
              {item.icon ? <item.icon className="size-5 shrink-0" /> : null}
              <span className="ml-2">{item.title}</span>
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
}

export function NavMain({ items }: { items: NavItem[] }) {
  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => (
          <NavItem key={item.title} item={item} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
