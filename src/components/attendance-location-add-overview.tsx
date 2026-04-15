"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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

type AttendanceLocationAddOverviewProps = {
  initialDate: string
}

type Coordinates = {
  lat: number
  lng: number
}

function loadLeafletAssets() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window is not available"))
  }

  if (window.L) {
    return Promise.resolve(window.L)
  }

  if (window.__absensiLeafletPromise) {
    return window.__absensiLeafletPromise
  }

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

function loadLocationsFromStorage() {
  if (typeof window === "undefined") {
    return seedLocations
  }

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
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(locations))
}

export function AttendanceLocationAddOverview({
  initialDate,
}: AttendanceLocationAddOverviewProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [name, setName] = React.useState("")
  const [code, setCode] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [coordinates, setCoordinates] = React.useState<Coordinates>({
    lat: -7.92920184,
    lng: 112.68395233,
  })
  const [radius, setRadius] = React.useState(50)
  const [requireSelfie, setRequireSelfie] = React.useState(true)
  const [requireGps, setRequireGps] = React.useState(true)
  const [isCreating, setIsCreating] = React.useState(false)
  const [mapError, setMapError] = React.useState("")
  const [selectedDate] = React.useState(initialDate)

  const mapRef = React.useRef<any>(null)
  const markerRef = React.useRef<any>(null)
  const circleRef = React.useRef<any>(null)
  const mapContainerRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    let isMounted = true

    loadLeafletAssets()
      .then((L) => {
        if (!isMounted || !mapContainerRef.current) {
          return
        }

        const center: [number, number] = [coordinates.lat, coordinates.lng]
        const map = L.map(mapContainerRef.current, {
          center,
          zoom: 13,
          scrollWheelZoom: true,
          zoomControl: true,
        })

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

        map.on("click", (event: any) => {
          setCoordinates({
            lat: event.latlng.lat,
            lng: event.latlng.lng,
          })
        })

        marker.on("dragend", (event: any) => {
          const nextLatLng = event.target.getLatLng()
          setCoordinates({
            lat: nextLatLng.lat,
            lng: nextLatLng.lng,
          })
        })

        mapRef.current = map
        markerRef.current = marker
        circleRef.current = circle
        setMapError("")
      })
      .catch(() => {
        if (!isMounted) {
          return
        }
        setMapError("Realtime map failed to load. Check your internet connection.")
      })

    return () => {
      isMounted = false
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  React.useEffect(() => {
    if (!mapRef.current || !markerRef.current || !circleRef.current) {
      return
    }

    const nextCenter: [number, number] = [coordinates.lat, coordinates.lng]
    mapRef.current.setView(nextCenter, mapRef.current.getZoom(), { animate: false })
    markerRef.current.setLatLng(nextCenter)
    circleRef.current.setLatLng(nextCenter)
    circleRef.current.setRadius(radius)
  }, [coordinates, radius])

  const handleSearchPlace = async () => {
    const query = searchQuery.trim()

    if (!query) {
      return
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}`
      )

      if (!response.ok) {
        setMapError("Place search failed.")
        return
      }

      const results = (await response.json()) as Array<{
        lat: string
        lon: string
        display_name: string
      }>

      if (!results[0]) {
        setMapError("Place not found on map.")
        return
      }

      const result = results[0]
      setCoordinates({
        lat: Number(result.lat),
        lng: Number(result.lon),
      })
      setDescription((current) => current || result.display_name)
      mapRef.current?.setZoom(15)
      setMapError("")
    } catch {
      setMapError("Place search failed.")
    }
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMapError("Geolocation is not supported in this browser.")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setMapError("")
      },
      () => {
        setMapError("Unable to access current device location.")
      }
    )
  }

  const handleCreateLocation = () => {
    if (!name.trim() || !code.trim()) {
      setMapError("Location name and code are required.")
      return
    }

    setIsCreating(true)

    const currentLocations = loadLocationsFromStorage()
    const nextLocation: AttendanceLocationRecord = {
      id: `loc_${Date.now()}`,
      name: name.trim(),
      code: code.trim(),
      description: description.trim() || "-",
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      radius,
      type: "MOBILE",
      active: true,
      requireSelfie,
      requireGps,
    }

    persistLocations([nextLocation, ...currentLocations])
    router.push("/dashboard/attendance/locations")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 sm:p-6">
        <div className="space-y-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2.3rem]">
                Add New Location
              </h1>
              <p className="mt-2 text-[1.15rem] text-slate-500">
                Register a new attendance point for your organization.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push("/dashboard/attendance/locations")}
                className="inline-flex items-center gap-3 rounded-[0.95rem] border border-slate-200 bg-white px-5 py-3 text-[1.05rem] font-medium text-slate-950"
              >
                <ArrowLeft className="size-5" />
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateLocation}
                disabled={isCreating}
                className="inline-flex items-center gap-3 rounded-[0.95rem] bg-black px-5 py-3 text-[1.05rem] font-medium text-white disabled:opacity-70"
              >
                <Save className="size-5" />
                {isCreating ? "Creating..." : "Create Location"}
              </button>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.9fr_0.95fr]">
            <article className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-7 py-7">
                <div className="flex items-start gap-4">
                  <MapPin className="mt-1 size-7 text-slate-950" />
                  <div>
                    <h2 className="text-[1.1rem] font-semibold text-slate-950">Geofencing Area</h2>
                    <p className="mt-1 text-[1.05rem] text-slate-500">
                      Click on the map to set the center point of the attendance zone.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6 p-5 sm:p-7">
                <div className="relative overflow-hidden rounded-[1.2rem] border border-slate-200 bg-slate-50">
                  <div className="absolute left-4 top-4 z-20 flex w-[30rem] max-w-[calc(100%-5.5rem)] items-center rounded-[1.1rem] bg-white px-4 py-3 shadow-sm">
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault()
                          handleSearchPlace()
                        }
                      }}
                      placeholder="Search place..."
                      className="min-w-0 flex-1 bg-transparent text-[1.05rem] text-slate-900 outline-hidden placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={handleSearchPlace}
                      className="text-slate-900"
                      aria-label="Search place"
                    >
                      <Search className="size-6" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    className="absolute right-4 top-4 z-20 inline-flex h-12 w-12 items-center justify-center rounded-[1rem] bg-white shadow-sm"
                    aria-label="Use current location"
                  >
                    <Crosshair className="size-6 text-slate-900" />
                  </button>

                  <div ref={mapContainerRef} className="h-[27rem] w-full bg-slate-100" />

                  {mapError ? (
                    <div className="absolute inset-x-5 bottom-16 z-20 rounded-[0.95rem] border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700 shadow-sm">
                      {mapError}
                    </div>
                  ) : null}

                  <div className="absolute bottom-5 left-5 z-20 rounded-[0.95rem] bg-white px-4 py-2 text-[1.05rem] text-slate-700 shadow-sm">
                    <span className="text-red-500">◉</span>{" "}
                    {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)} | R: {radius}m
                  </div>
                </div>

                <div className="rounded-[1.2rem] border border-slate-200 bg-white px-6 py-6">
                  <p className="text-[1.3rem] font-semibold text-slate-950">Radius: {radius}m</p>
                  <input
                    type="range"
                    min="25"
                    max="300"
                    step="5"
                    value={radius}
                    onChange={(event) => setRadius(Number(event.target.value))}
                    className="mt-5 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200"
                  />
                  <p className="mt-3 text-[1.05rem] text-slate-500">
                    Adjust the allowed distance from the center point.
                  </p>
                </div>
              </div>
            </article>

            <div className="space-y-6">
              <article className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-7 py-7">
                  <div className="flex items-center gap-4">
                    <Info className="size-6 text-slate-500" />
                    <h2 className="text-[1.1rem] font-semibold text-slate-950">General Information</h2>
                  </div>
                </div>

                <div className="space-y-5 p-7">
                  <div className="space-y-2">
                    <label className="text-[1.05rem] font-medium text-slate-950">Location Name *</label>
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="e.g., Head Office"
                      className="w-full rounded-[0.95rem] border border-slate-200 px-4 py-3 text-[1.05rem] outline-hidden placeholder:text-slate-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[1.05rem] font-medium text-slate-950">Location Code *</label>
                    <input
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      placeholder="e.g., HO-001"
                      className="w-full rounded-[0.95rem] border border-slate-200 px-4 py-3 text-[1.05rem] outline-hidden placeholder:text-slate-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[1.05rem] font-medium text-slate-950">Address / Description</label>
                    <input
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Optional address details"
                      className="w-full rounded-[0.95rem] border border-slate-200 px-4 py-3 text-[1.05rem] outline-hidden placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </article>

              <article className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-7 py-7">
                  <div className="flex items-center gap-4">
                    <Crosshair className="size-6 text-slate-500" />
                    <h2 className="text-[1.1rem] font-semibold text-slate-950">Coordinates</h2>
                  </div>
                </div>

                <div className="grid gap-5 p-7 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[1.05rem] text-slate-500">Latitude</label>
                    <input
                      value={coordinates.lat.toFixed(8)}
                      readOnly
                      className="w-full rounded-[0.95rem] border border-slate-200 px-4 py-3 text-[1.05rem] text-slate-950 outline-hidden"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[1.05rem] text-slate-500">Longitude</label>
                    <input
                      value={coordinates.lng.toFixed(8)}
                      readOnly
                      className="w-full rounded-[0.95rem] border border-slate-200 px-4 py-3 text-[1.05rem] text-slate-950 outline-hidden"
                    />
                  </div>
                </div>
              </article>

              <article className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-7 py-7">
                  <div className="flex items-center gap-4">
                    <Settings2 className="size-6 text-slate-500" />
                    <h2 className="text-[1.1rem] font-semibold text-slate-950">Configuration</h2>
                  </div>
                </div>

                <div className="space-y-6 p-7">
                  {[
                    {
                      label: "Require Selfie",
                      description: "Users must take a photo",
                      checked: requireSelfie,
                      onChange: setRequireSelfie,
                    },
                    {
                      label: "Require GPS",
                      description: "Force GPS validation",
                      checked: requireGps,
                      onChange: setRequireGps,
                    },
                  ].map((item, index) => (
                    <div
                      key={item.label}
                      className={`${index ? "border-t border-slate-200 pt-6" : ""} flex items-start justify-between gap-4`}
                    >
                      <div>
                        <p className="text-[1.3rem] font-medium text-slate-950">{item.label}</p>
                        <p className="mt-1 text-[1.05rem] text-slate-500">{item.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => item.onChange((current) => !current)}
                        className={`relative inline-flex h-8 w-12 items-center rounded-full ${
                          item.checked ? "bg-slate-400" : "bg-slate-200"
                        }`}
                      >
                        <span
                          className={`absolute inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm transition ${
                            item.checked ? "left-5" : "left-1"
                          }`}
                        >
                          <Check className="size-3.5" />
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-[1.6rem] border border-blue-200 bg-blue-50 p-6">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-500">
                    <Smartphone className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-[1.2rem] font-medium text-slate-950">Mobile Attendance Point</h3>
                    <p className="mt-2 text-[1.05rem] leading-7 text-blue-700">
                      This location will be available for users to check in via their mobile
                      devices within the specified radius.
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
