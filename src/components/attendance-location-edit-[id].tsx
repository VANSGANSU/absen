"use client"

import * as React from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft,
  Check,
  Crosshair,
  Info,
  MapPin,
  Save,
  Search,
  Settings2,
  Smartphone,
} from "lucide-react"
import {
  LOCATIONS_STORAGE_KEY,
  seedLocations,
  type AttendanceLocationRecord,
} from "@/lib/locations-store"

declare global {
  interface Window {
    L?: any
    __absensiLeafletPromise?: Promise<any>
  }
}

function loadLeafletAssets() {
  // ... (sama persis seperti di add-overview)
  if (typeof window === "undefined") return Promise.reject(new Error("Window is not available"))
  if (window.L) return Promise.resolve(window.L)
  if (window.__absensiLeafletPromise) return window.__absensiLeafletPromise

  window.__absensiLeafletPromise = new Promise((resolve, reject) => {
    const existingStylesheet = document.getElementById("absensi-leaflet-style")
    if (!existingStylesheet) {
      const link = document.createElement("link")
      link.id = "absensi-leaflet-style"
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      document.head.appendChild(link)
    }
    const existingScript = document.getElementById("absensi-leaflet-script")
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.L))
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Leaflet")))
      return
    }
    const script = document.createElement("script")
    script.id = "absensi-leaflet-script"
    script.async = true
    script.defer = true
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    script.onload = () => resolve(window.L)
    script.onerror = () => reject(new Error("Failed to load Leaflet"))
    document.head.appendChild(script)
  })
  return window.__absensiLeafletPromise
}

function loadLocationsFromStorage(): AttendanceLocationRecord[] {
  if (typeof window === "undefined") return seedLocations
  const stored = window.localStorage.getItem(LOCATIONS_STORAGE_KEY)
  if (!stored) {
    window.localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(seedLocations))
    return seedLocations
  }
  try {
    const parsed = JSON.parse(stored) as AttendanceLocationRecord[]
    return parsed.length ? parsed : seedLocations
  } catch {
    return seedLocations
  }
}

function persistLocations(locations: AttendanceLocationRecord[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(locations))
}

export default function EditLocationPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [loading, setLoading] = React.useState(true)
  const [notFound, setNotFound] = React.useState(false)

  // Form states
  const [searchQuery, setSearchQuery] = React.useState("")
  const [name, setName] = React.useState("")
  const [code, setCode] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [coordinates, setCoordinates] = React.useState({ lat: -7.92920184, lng: 112.68395233 })
  const [radius, setRadius] = React.useState(50)
  const [requireSelfie, setRequireSelfie] = React.useState(true)
  const [requireGps, setRequireGps] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [mapError, setMapError] = React.useState("")
  const [manualLat, setManualLat] = React.useState("")
  const [manualLng, setManualLng] = React.useState("")

  const mapRef = React.useRef<any>(null)
  const markerRef = React.useRef<any>(null)
  const circleRef = React.useRef<any>(null)
  const mapContainerRef = React.useRef<HTMLDivElement | null>(null)

  // Load existing data
  React.useEffect(() => {
    const locations = loadLocationsFromStorage()
    const found = locations.find(loc => loc.id === id)
    if (!found) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setName(found.name)
    setCode(found.code)
    setDescription(found.description)
    setCoordinates({ lat: found.latitude, lng: found.longitude })
    setRadius(found.radius)
    setRequireSelfie(found.requireSelfie)
    setRequireGps(found.requireGps)
    setManualLat(found.latitude.toFixed(8))
    setManualLng(found.longitude.toFixed(8))
    setLoading(false)
  }, [id])

  // Sync manual inputs when coordinates change
  React.useEffect(() => {
    setManualLat(coordinates.lat.toFixed(8))
    setManualLng(coordinates.lng.toFixed(8))
  }, [coordinates])

  // Initialize map after data loaded
  React.useEffect(() => {
    if (loading || notFound) return
    let isMounted = true

    loadLeafletAssets()
      .then((L) => {
        if (!isMounted || !mapContainerRef.current) return
        const center: [number, number] = [coordinates.lat, coordinates.lng]
        const map = L.map(mapContainerRef.current, { center, zoom: 13, scrollWheelZoom: true, zoomControl: true })
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(map)

        const marker = L.marker(center, { draggable: true }).addTo(map)
        const circle = L.circle(center, {
          radius,
          color: "#2563eb",
          weight: 2,
          fillColor: "#2563eb",
          fillOpacity: 0.12,
        }).addTo(map)

        map.on("click", (e: any) => setCoordinates({ lat: e.latlng.lat, lng: e.latlng.lng }))
        marker.on("dragend", (e: any) => {
          const ll = e.target.getLatLng()
          setCoordinates({ lat: ll.lat, lng: ll.lng })
        })

        mapRef.current = map
        markerRef.current = marker
        circleRef.current = circle
      })
      .catch(() => { if (isMounted) setMapError("Map failed to load.") })

    return () => {
      isMounted = false
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [loading, notFound, coordinates.lat, coordinates.lng, radius])

  // Update map when coordinates/radius change
  React.useEffect(() => {
    if (!mapRef.current || !markerRef.current || !circleRef.current) return
    const c: [number, number] = [coordinates.lat, coordinates.lng]
    mapRef.current.setView(c, mapRef.current.getZoom(), { animate: false })
    markerRef.current.setLatLng(c)
    circleRef.current.setLatLng(c)
    circleRef.current.setRadius(radius)
  }, [coordinates, radius])

  const handleSearchPlace = async () => {
    const query = searchQuery.trim()
    if (!query) return
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error()
      const results = await res.json() as any[]
      if (!results[0]) { setMapError("Place not found."); return }
      const r = results[0]
      setCoordinates({ lat: Number(r.lat), lng: Number(r.lon) })
      setDescription(prev => prev || r.display_name)
      mapRef.current?.setZoom(15)
      setMapError("")
    } catch { setMapError("Search failed.") }
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) { setMapError("Geolocation not supported."); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoordinates({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setMapError("Unable to get location.")
    )
  }

  const handleCoordinateUpdate = () => {
    const lat = parseFloat(manualLat), lng = parseFloat(manualLng)
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      setCoordinates({ lat, lng })
      setMapError("")
    } else {
      setMapError("Invalid coordinates.")
    }
  }

  const handleSave = () => {
    if (!name.trim() || !code.trim()) { setMapError("Name and code required."); return }
    setIsSaving(true)
    const all = loadLocationsFromStorage()
    const updated = all.map(loc => loc.id === id ? {
      ...loc,
      name: name.trim(),
      code: code.trim(),
      description: description.trim() || "-",
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      radius,
      requireSelfie,
      requireGps,
    } : loc)
    persistLocations(updated)
    router.push("/dashboard/attendance/locations")
    router.refresh()
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>
  if (notFound) return <div className="p-8 text-center text-red-500">Location not found.</div>

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 sm:p-6">
        <div className="space-y-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2.3rem]">
                Edit Location
              </h1>
              <p className="mt-2 text-[1.15rem] text-slate-500">Update attendance point details.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push("/dashboard/attendance/locations")}
                className="inline-flex items-center gap-3 rounded-[0.95rem] border border-slate-200 bg-white px-5 py-3 text-[1.05rem] font-medium text-slate-950"
              >
                <ArrowLeft className="size-5" /> Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-3 rounded-[0.95rem] bg-black px-5 py-3 text-[1.05rem] font-medium text-white disabled:opacity-70"
              >
                <Save className="size-5" />
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.9fr_0.95fr]">
            {/* Map Section (identik dengan add) */}
            <article className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-7 py-7">
                <div className="flex items-start gap-4">
                  <MapPin className="mt-1 size-7 text-slate-950" />
                  <div>
                    <h2 className="text-[1.1rem] font-semibold text-slate-950">Geofencing Area</h2>
                    <p className="mt-1 text-[1.05rem] text-slate-500">Click on the map to set the center point.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-6 p-5 sm:p-7">
                <div className="relative overflow-hidden rounded-[1.2rem] border border-slate-200 bg-slate-50">
                  <div className="absolute left-4 top-4 z-20 flex w-[30rem] max-w-[calc(100%-5.5rem)] items-center rounded-[1.1rem] bg-white px-4 py-3 shadow-sm">
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearchPlace()}
                      placeholder="Search place..."
                      className="min-w-0 flex-1 bg-transparent text-[1.05rem] outline-hidden placeholder:text-slate-400"
                    />
                    <button onClick={handleSearchPlace} className="text-slate-900"><Search className="size-6" /></button>
                  </div>
                  <button
                    onClick={handleUseCurrentLocation}
                    className="absolute right-4 top-4 z-20 inline-flex h-12 w-12 items-center justify-center rounded-[1rem] bg-white shadow-sm"
                  >
                    <Crosshair className="size-6 text-slate-900" />
                  </button>
                  <div ref={mapContainerRef} className="h-[27rem] w-full bg-slate-100" />
                  {mapError && (
                    <div className="absolute inset-x-5 bottom-16 z-20 rounded-[0.95rem] border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                      {mapError}
                    </div>
                  )}
                  <div className="absolute bottom-5 left-5 z-20 rounded-[0.95rem] bg-white px-4 py-2 text-[1.05rem] text-slate-700 shadow-sm">
                    <span className="text-red-500">◉</span> {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)} | R: {radius}m
                  </div>
                </div>
                <div className="rounded-[1.2rem] border border-slate-200 bg-white px-6 py-6">
                  <p className="text-[1.3rem] font-semibold text-slate-950">Radius: {radius}m</p>
                  <input
                    type="range" min="25" max="300" step="5" value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    className="mt-5 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200"
                  />
                </div>
              </div>
            </article>

            {/* Right panel (identik dengan add) */}
            <div className="space-y-6">
              <article className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-7 py-7">
                  <div className="flex items-center gap-4"><Info className="size-6" /><h2 className="text-[1.1rem] font-semibold">General Information</h2></div>
                </div>
                <div className="space-y-5 p-7">
                  <div><label className="font-medium">Location Name *</label><input value={name} onChange={e => setName(e.target.value)} className="w-full rounded-[0.95rem] border border-slate-200 px-4 py-3" /></div>
                  <div><label className="font-medium">Location Code *</label><input value={code} onChange={e => setCode(e.target.value)} className="w-full rounded-[0.95rem] border border-slate-200 px-4 py-3" /></div>
                  <div><label className="font-medium">Address / Description</label><input value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-[0.95rem] border border-slate-200 px-4 py-3" /></div>
                </div>
              </article>
              <article className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-7 py-7"><div className="flex items-center gap-4"><Crosshair className="size-6" /><h2 className="text-[1.1rem] font-semibold">Coordinates</h2></div></div>
                <div className="grid gap-5 p-7 sm:grid-cols-2">
                  <div><label>Latitude</label><input value={manualLat} onChange={e => setManualLat(e.target.value)} onBlur={handleCoordinateUpdate} className="w-full rounded-[0.95rem] border px-4 py-3" /></div>
                  <div><label>Longitude</label><input value={manualLng} onChange={e => setManualLng(e.target.value)} onBlur={handleCoordinateUpdate} className="w-full rounded-[0.95rem] border px-4 py-3" /></div>
                </div>
                <div className="px-7 pb-5"><button onClick={handleCoordinateUpdate} className="text-sm text-blue-600 hover:underline">Apply to map</button></div>
              </article>
              <article className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white">
                <div className="border-b px-7 py-7"><Settings2 className="size-6 inline mr-2" />Configuration</div>
                <div className="space-y-6 p-7">
                  {[{ label: "Require Selfie", checked: requireSelfie, set: setRequireSelfie }, { label: "Require GPS", checked: requireGps, set: setRequireGps }].map((item, i) => (
                    <div key={item.label} className={`flex justify-between ${i ? "border-t pt-6" : ""}`}>
                      <div><p className="font-medium">{item.label}</p><p className="text-slate-500">{item.label === "Require Selfie" ? "Users must take a photo" : "Force GPS validation"}</p></div>
                      <button onClick={() => item.set(prev => !prev)} className={`relative h-8 w-12 rounded-full ${item.checked ? "bg-slate-400" : "bg-slate-200"}`}>
                        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${item.checked ? "left-5" : "left-1"}`}><Check className="size-3.5 m-auto mt-1.5" /></span>
                      </button>
                    </div>
                  ))}
                </div>
              </article>
              <article className="rounded-[1.6rem] border border-blue-200 bg-blue-50 p-6">
                <div className="flex gap-4"><Smartphone className="size-6" /><div><h3 className="font-medium">Mobile Attendance Point</h3><p className="text-blue-700">This location will be available for check‑in within the radius.</p></div></div>
              </article>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}