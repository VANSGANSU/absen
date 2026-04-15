import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { requireSessionUser } from "@/lib/auth"
import {
  LOCATION_ADD_ACCESS_COOKIE,
  getLocationAddAccessCookieOptions,
} from "@/lib/location-add-access"

export async function POST() {
  await requireSessionUser()

  const cookieStore = await cookies()
  cookieStore.set(
    LOCATION_ADD_ACCESS_COOKIE,
    "allowed",
    getLocationAddAccessCookieOptions()
  )

  return NextResponse.json({ ok: true })
}
