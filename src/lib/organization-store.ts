"use client"

import * as React from "react"

export type OrganizationSettings = {
  name: string
  logo: string | null
  description: string
  industry: string[]
  email: string
  phone: string
  website: string
  address: string
  country: string
  state: string
  city: string
  postalCode: string
  timezone: string
  currency: string
  timeFormat: "12h" | "24h"
  dateFormat: string
}

export const DEFAULT_SETTINGS: OrganizationSettings = {
  name: "MAGANG UBIG",
  logo: null,
  description: "Brief description of your organization",
  industry: ["Technology & IT"],
  email: "info@example.com",
  phone: "082231020440",
  website: "https://example.com",
  address: "Jl. Raya Malang",
  country: "Indonesia",
  state: "Jawa Timur",
  city: "Malang",
  postalCode: "12345",
  timezone: "Asia/Jakarta (UTC+07:00)",
  currency: "IDR — Rupiah",
  timeFormat: "24h",
  dateFormat: "DD/MM/YYYY",
}

const STORAGE_KEY = "absensi.organization.settings"

export function useOrganizationStore() {
  const [settings, setSettings] = React.useState<OrganizationSettings>(DEFAULT_SETTINGS)
  const [isLoaded, setIsLoaded] = React.useState(false)

  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setSettings(JSON.parse(stored))
      } catch (e) {
        console.error("Failed to parse organization settings", e)
      }
    }
    setIsLoaded(true)
  }, [])

  const updateSettings = (updates: Partial<OrganizationSettings>) => {
    const newSettings = { ...settings, ...updates }
    setSettings(newSettings)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings))
    
    // Dispatch a custom event to notify other components
    window.dispatchEvent(new Event("organization-settings-updated"))
  }

  return { settings, updateSettings, isLoaded }
}

// Singleton-like access for components that don't need the hook
export function getOrganizationSettings(): OrganizationSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch (e) {
      return DEFAULT_SETTINGS
    }
  }
  return DEFAULT_SETTINGS
}
