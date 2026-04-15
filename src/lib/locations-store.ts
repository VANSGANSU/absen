export type AttendanceLocationRecord = {
  id: string
  name: string
  code: string
  description: string
  latitude: number
  longitude: number
  radius: number
  type: "MOBILE"
  active: boolean
  requireSelfie: boolean
  requireGps: boolean
}

export const LOCATIONS_STORAGE_KEY = "absensi.attendance.locations"

export const seedLocations: AttendanceLocationRecord[] = [
  {
    id: "loc_ubig",
    name: "UBIG",
    code: "UBG01",
    description: "-",
    latitude: -7.919881,
    longitude: 112.612277,
    radius: 150,
    type: "MOBILE",
    active: true,
    requireSelfie: true,
    requireGps: true,
  },
]
