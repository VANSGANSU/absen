"use client"

import * as React from "react"
import {
  Building2,
  Phone,
  Globe,
  MapPin,
  Clock,
  Coins,
  Trash2,
  Mail,
  Upload,
  Eye,
  Copy,
  RefreshCcw,
  Check,
  ChevronDown,
  X,
  Plus,
  Save,
  Calendar,
} from "lucide-react"
import { useOrganizationStore, type OrganizationSettings } from "@/lib/organization-store"

const INDUSTRIES = [
  "Technology & IT",
  "Education",
  "Manufacturing",
  "Healthcare",
  "Finance",
  "Retail",
  "Construction",
  "Services",
  "Government",
  "Other",
]

const TIMEZONES = [
  "Asia/Jakarta (UTC+07:00)",
  "Asia/Singapore (UTC+08:00)",
  "Asia/Tokyo (UTC+09:00)",
  "Europe/London (UTC+00:00)",
  "America/New_York (UTC-05:00)",
]

const CURRENCIES = [
  "IDR — Rupiah",
  "USD — US Dollar",
  "EUR — Euro",
  "SGD — Singapore Dollar",
  "JPY — Japanese Yen",
]

export function OrganizationSettingsPage() {
  const { settings, updateSettings, isLoaded } = useOrganizationStore()
  const [localSettings, setLocalSettings] = React.useState(settings)
  const [isSaving, setIsSaving] = React.useState(false)
  const [showCode, setShowCode] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (isLoaded) {
      setLocalSettings(settings)
    }
  }, [isLoaded, settings])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setLocalSettings((prev: OrganizationSettings) => ({ ...prev, logo: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800))
    updateSettings(localSettings)
    setIsSaving(false)
  }

  const toggleIndustry = (industry: string) => {
    setLocalSettings((prev: OrganizationSettings) => ({
      ...prev,
      industry: prev.industry.includes(industry)
        ? prev.industry.filter((i: string) => i !== industry)
        : [...prev.industry, industry].slice(0, 10),
    }))
  }

  if (!isLoaded) return null

  return (
    <div className="flex flex-col space-y-10 p-6 sm:p-10 pb-24">
      {/* Top Header Card */}
      <div className="flex flex-col gap-6 rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm md:flex-row md:items-center">
        <div className="relative group">
          <div className="size-24 overflow-hidden rounded-[1.5rem] bg-slate-50 border border-slate-200 flex items-center justify-center">
            {localSettings.logo ? (
              <img src={localSettings.logo} alt="Logo" className="size-full object-cover" />
            ) : (
              <Building2 className="size-10 text-slate-300" />
            )}
          </div>
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{localSettings.name}</h1>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-emerald-600 border border-emerald-100">
              Active
            </span>
          </div>
          <p className="text-sm text-slate-500">Manage your organization information, settings, and preferences</p>
          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              Invitation Code:
              <div className="flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 font-mono text-slate-600">
                {showCode ? "ABC-1234" : "••••••••"}
                <button onClick={() => setShowCode(!showCode)} className="ml-1 hover:text-slate-900 transition">
                  <Eye className="size-3" />
                </button>
              </div>
              <button className="hover:text-slate-900 transition"><Copy className="size-3" /></button>
              <button className="hover:text-slate-900 transition"><RefreshCcw className="size-3" /></button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left: Basic Information */}
        <div className="space-y-8 rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
              <Building2 className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Basic Information</h2>
              <p className="text-xs text-slate-500">Organization name, logo, and general details</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="mb-3 block text-sm font-semibold text-slate-900">Organization Logo</label>
              <div className="flex items-center gap-4">
                <div className="size-16 overflow-hidden rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                  {localSettings.logo ? (
                    <img src={localSettings.logo} alt="Logo" className="size-full object-cover" />
                  ) : (
                    <Building2 className="size-6 text-slate-300" />
                  )}
                </div>
                <div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <Upload className="size-3.5" />
                    Change
                  </button>
                  <p className="mt-1 text-[0.65rem] text-slate-400 font-medium">JPG, PNG, WEBP (max 5MB)</p>
                  <input type="file" ref={fileInputRef} onChange={handleLogoChange} accept="image/*" className="hidden" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900 flex items-center gap-1">
                Organization Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={localSettings.name}
                onChange={(e) => setLocalSettings((prev: OrganizationSettings) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-slate-300"
              />
              <p className="text-[0.65rem] text-slate-400 font-medium">This will be used as both display name and legal name</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900">Description</label>
              <textarea
                value={localSettings.description}
                onChange={(e) => setLocalSettings((prev: OrganizationSettings) => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-slate-300 resize-none"
                placeholder="Brief description of your organization"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-900">Industry (Max 10)</label>
              <div className="relative">
                <select 
                  className="w-full appearance-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none bg-white"
                  onChange={(e) => e.target.value && toggleIndustry(e.target.value)}
                  value=""
                >
                  <option value="" disabled>Select industries...</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <div className="flex flex-wrap gap-2">
                {localSettings.industry.map((i: string) => (
                  <span key={i} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600">
                    {i}
                    <button onClick={() => toggleIndustry(i)}><X className="size-3 hover:text-red-500" /></button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Contact & Location */}
        <div className="space-y-8 rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
              <MapPin className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Contact & Location</h2>
              <p className="text-xs text-slate-500">Contact details and address information</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Mail className="size-3" /> Email Address
              </label>
              <input
                type="email"
                value={localSettings.email}
                onChange={(e) => setLocalSettings((prev: OrganizationSettings) => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-slate-300"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Phone className="size-3" /> Phone Number
              </label>
              <input
                type="text"
                value={localSettings.phone}
                onChange={(e) => setLocalSettings((prev: OrganizationSettings) => ({ ...prev, phone: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-slate-300"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Globe className="size-3" /> Website
              </label>
              <input
                type="text"
                value={localSettings.website}
                onChange={(e) => setLocalSettings((prev: OrganizationSettings) => ({ ...prev, website: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-slate-300"
              />
            </div>

            <div className="pt-2 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Street Address</label>
                <input
                  type="text"
                  value={localSettings.address}
                  onChange={(e) => setLocalSettings((prev: OrganizationSettings) => ({ ...prev, address: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-slate-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Country</label>
                  <div className="relative">
                    <select className="w-full appearance-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none bg-white">
                      <option>Indonesia</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">State / Province</label>
                  <div className="relative">
                    <select className="w-full appearance-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none bg-white">
                      <option>Jawa Timur</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">City</label>
                  <div className="relative">
                    <select className="w-full appearance-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none bg-white">
                      <option>Malang</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Postal Code</label>
                  <input
                    type="text"
                    value={localSettings.postalCode}
                    onChange={(e) => setLocalSettings((prev: OrganizationSettings) => ({ ...prev, postalCode: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-slate-300"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="space-y-8 rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
            <Clock className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Preferences</h2>
            <p className="text-xs text-slate-500">Configure how time, currency, and dates are displayed across your organization.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Globe className="size-3" /> Timezone
              </label>
              <div className="relative">
                <select
                  value={localSettings.timezone}
                  onChange={(e) => setLocalSettings((prev: OrganizationSettings) => ({ ...prev, timezone: e.target.value }))}
                  className="w-full appearance-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none bg-white"
                >
                  {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Clock className="size-3" /> Time Format
              </label>
              <div className="relative">
                <select
                  value={localSettings.timeFormat}
                  onChange={(e) => setLocalSettings((prev: OrganizationSettings) => ({ ...prev, timeFormat: e.target.value as "12h" | "24h" }))}
                  className="w-full appearance-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none bg-white"
                >
                  <option value="24h">24-hour (13:00)</option>
                  <option value="12h">12-hour (1:00 PM)</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Coins className="size-3" /> Currency
              </label>
              <div className="relative">
                <select
                  value={localSettings.currency}
                  onChange={(e) => setLocalSettings((prev: OrganizationSettings) => ({ ...prev, currency: e.target.value }))}
                  className="w-full appearance-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none bg-white"
                >
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Calendar className="size-3" /> Date Format
              </label>
              <div className="relative">
                <select
                  value={localSettings.dateFormat}
                  onChange={(e) => setLocalSettings((prev: OrganizationSettings) => ({ ...prev, dateFormat: e.target.value }))}
                  className="w-full appearance-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none bg-white"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY (30/04/2026)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (04/30/2026)</option>
                  <option value="YYYY/MM/DD">YYYY/MM/DD (2026/04/30)</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-[2rem] border border-red-100 bg-red-50/50 p-8 shadow-sm">
        <h3 className="text-lg font-semibold text-red-900">Delete {localSettings.name}</h3>
        <p className="mt-1 text-sm text-red-700/70">These actions are permanent and cannot be undone.</p>
        <button className="mt-6 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-red-700 transition">
          Delete
        </button>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-t border-slate-100 p-4 sm:left-[280px]">
        <div className="mx-auto flex max-w-5xl items-center justify-end gap-3">
          <button
            onClick={() => setLocalSettings(settings)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            <RefreshCcw className="size-4" /> Discard
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-xl bg-black px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-black/10 transition hover:bg-slate-800 disabled:opacity-60"
          >
            {isSaving ? (
              <RefreshCcw className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
