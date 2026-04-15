export const LOCATION_ADD_ACCESS_COOKIE = "absensi_location_add_access"

export function getLocationAddAccessCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  }
}
