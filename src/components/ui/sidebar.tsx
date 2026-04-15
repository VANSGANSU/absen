"use client"

import { Slot } from "@radix-ui/react-slot"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"

type SidebarContextValue = {
  isMobile: boolean
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  toggleSidebar: () => void
  closeSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)

  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

function SidebarProvider({
  defaultOpen = true,
  children,
}: React.PropsWithChildren<{ defaultOpen?: boolean }>) {
  const [open, setOpen] = React.useState(defaultOpen)
  const [isMobile, setIsMobile] = React.useState(false)
  const hasInitializedViewport = React.useRef(false)

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)")
    const update = () => {
      const matches = mediaQuery.matches
      setIsMobile(matches)

      if (!hasInitializedViewport.current) {
        setOpen(matches ? false : defaultOpen)
        hasInitializedViewport.current = true
      }
    }

    update()
    mediaQuery.addEventListener("change", update)

    return () => mediaQuery.removeEventListener("change", update)
  }, [])

  const toggleSidebar = React.useCallback(() => {
    setOpen((current) => !current)
  }, [])

  const closeSidebar = React.useCallback(() => {
    setOpen(false)
  }, [])

  React.useEffect(() => {
    if (!isMobile) {
      return
    }

    document.body.style.overflow = open ? "hidden" : ""

    return () => {
      document.body.style.overflow = ""
    }
  }, [isMobile, open])

  return (
    <SidebarContext.Provider
      value={{ isMobile, open, setOpen, toggleSidebar, closeSidebar }}
    >
      <div className="group/sidebar-wrapper flex min-h-screen w-full bg-background text-foreground">
        {children}
        {isMobile && open ? (
          <button
            type="button"
            aria-label="Close sidebar overlay"
            className="fixed inset-0 z-40 bg-black/20 md:hidden"
            onClick={closeSidebar}
          />
        ) : null}
      </div>
    </SidebarContext.Provider>
  )
}

function Sidebar({
  className,
  collapsible = "offcanvas",
  ...props
}: React.ComponentProps<"aside"> & {
  collapsible?: "offcanvas" | "icon" | "none"
}) {
  const { open, isMobile } = useSidebar()
  const isCollapsed = collapsible === "icon" && !open

  return (
    <aside
      data-slot="sidebar"
      data-state={open ? "expanded" : "collapsed"}
      data-collapsible={isCollapsed ? "icon" : collapsible === "none" ? "none" : ""}
      className={cn(
        "group/sidebar shrink-0 border-r border-border bg-sidebar text-sidebar-foreground",
        isMobile
          ? cn(
              "fixed inset-y-0 left-0 z-50 block h-screen w-[min(18rem,calc(100vw-1.5rem))] transition-transform duration-200 md:hidden",
              open ? "translate-x-0" : "-translate-x-full"
            )
          : cn("hidden transition-[width] duration-200 md:block", isCollapsed ? "w-20" : "w-72"),
        className
      )}
      {...props}
    />
  )
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn("flex flex-col gap-2 border-b border-border p-2", className)}
      {...props}
    />
  )
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-2", className)}
      {...props}
    />
  )
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn("border-t border-border p-2", className)}
      {...props}
    />
  )
}

function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn("flex min-w-0 flex-1 flex-col bg-background", className)}
      {...props}
    />
  )
}

function SidebarRail({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-rail"
      aria-hidden="true"
      className={cn("hidden w-px self-stretch bg-border/60 md:block", className)}
      {...props}
    />
  )
}

function SidebarTrigger({
  className,
  ...props
}: React.ComponentProps<"button">) {
  const { open, toggleSidebar } = useSidebar()

  return (
    <button
      data-slot="sidebar-trigger"
      type="button"
      onClick={toggleSidebar}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-foreground transition hover:bg-muted",
        className
      )}
      {...props}
    >
      {open ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
      <span className="sr-only">Toggle Sidebar</span>
    </button>
  )
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <section
      data-slot="sidebar-group"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function SidebarGroupLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-sidebar="label"
      className={cn(
        "px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  )
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-item"
      className={cn("group/menu-item relative", className)}
      {...props}
    />
  )
}

function SidebarMenuButton({
  asChild = false,
  className,
  size = "default",
  isActive = false,
  tooltip,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean
  isActive?: boolean
  size?: "default" | "sm" | "lg"
  tooltip?: React.ReactNode
}) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="sidebar-menu-button"
      data-size={size}
      data-active={isActive}
      title={typeof tooltip === "string" ? tooltip : undefined}
      className={cn(
        "flex w-full items-center gap-2 overflow-hidden rounded-md px-2 py-2 text-left text-sm outline-hidden transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        size === "sm" && "h-8 text-xs",
        size === "default" && "h-9",
        size === "lg" && "h-12",
        isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
        className
      )}
      {...props}
    />
  )
}

function SidebarMenuAction({
  className,
  showOnHover = false,
  ...props
}: React.ComponentProps<"button"> & { showOnHover?: boolean }) {
  return (
    <button
      data-slot="sidebar-menu-action"
      type="button"
      className={cn(
        "absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground",
        showOnHover && "opacity-0 transition-opacity group-hover/menu-item:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function SidebarMenuSub({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      className={cn("mt-1 ml-4 flex flex-col gap-1 border-l border-border pl-2", className)}
      {...props}
    />
  )
}

function SidebarMenuSubItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-sub-item"
      className={cn(className)}
      {...props}
    />
  )
}

function SidebarMenuSubButton({
  asChild = false,
  className,
  ...props
}: React.ComponentProps<"a"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "a"

  return (
    <Comp
      data-slot="sidebar-menu-sub-button"
      className={cn(
        "flex h-8 items-center rounded-md px-2 text-sm text-muted-foreground outline-hidden transition hover:bg-muted hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
}
