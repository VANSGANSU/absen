export type AttendanceDeviceType =
  | "Fingerprint"
  | "Geofence Virtual Perimeter"
  | "MOBILE"

export type AttendanceDeviceRecord = {
  id: string
  name: string
  serialNumber: string
  type: AttendanceDeviceType
  location: string
  active: boolean
  createdAt: string
}

export const DEVICES_STORAGE_KEY = "absensi.attendance.devices"

export const deviceTypeOptions: AttendanceDeviceType[] = [
  "Fingerprint",
  "Geofence Virtual Perimeter",
  "MOBILE",
]

export const seedDevices: AttendanceDeviceRecord[] = [
  {
    id: "device_ubig_mobile",
    name: "UBIG",
    serialNumber: "-",
    type: "MOBILE",
    location: "-",
    active: true,
    createdAt: "3/25/2026",
  },
]
