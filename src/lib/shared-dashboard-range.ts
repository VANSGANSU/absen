import * as React from "react"

export type SharedDashboardRange =
  | "Today"
  | "Yesterday"
  | "This week"
  | "This month"
  | "This year"
  | "Last year"
  | "Last 7 days"
  | "Last 30 days"

export type SharedDateOption = {
  group: string
  label: SharedDashboardRange
}

const STORAGE_KEY = "absensi.dashboard.shared-range"
const CUSTOM_EVENT = "absensi:dashboard-range-change"

export const sharedDateOptions: SharedDateOption[] = [
  { group: "Quick", label: "Today" },
  { group: "Quick", label: "Yesterday" },
  { group: "Period", label: "This week" },
  { group: "Period", label: "This month" },
  { group: "Period", label: "This year" },
  { group: "Period", label: "Last year" },
  { group: "Historical", label: "Last 7 days" },
  { group: "Historical", label: "Last 30 days" },
]

function isSharedRange(value: string): value is SharedDashboardRange {
  return sharedDateOptions.some((item) => item.label === value)
}

function readStoredRange() {
  if (typeof window === "undefined") {
    return null
  }

  const storedValue = window.localStorage.getItem(STORAGE_KEY)
  return storedValue && isSharedRange(storedValue) ? storedValue : null
}

export function useSharedDashboardRange(defaultRange: SharedDashboardRange = "This week") {
  const [selectedRange, setSelectedRangeState] = React.useState<SharedDashboardRange>(defaultRange)

  React.useEffect(() => {
    const storedValue = readStoredRange()
    if (storedValue) {
      setSelectedRangeState(storedValue)
      return
    }

    window.localStorage.setItem(STORAGE_KEY, defaultRange)
  }, [defaultRange])

  React.useEffect(() => {
    const handleStorage = () => {
      const storedValue = readStoredRange()
      if (storedValue) {
        setSelectedRangeState(storedValue)
      }
    }

    window.addEventListener("storage", handleStorage)
    window.addEventListener(CUSTOM_EVENT, handleStorage)

    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener(CUSTOM_EVENT, handleStorage)
    }
  }, [])

  const setSelectedRange = React.useCallback((value: SharedDashboardRange) => {
    setSelectedRangeState(value)

    if (typeof window === "undefined") {
      return
    }

    window.localStorage.setItem(STORAGE_KEY, value)
    window.dispatchEvent(new Event(CUSTOM_EVENT))
  }, [])

  return {
    selectedRange,
    setSelectedRange,
  }
}
