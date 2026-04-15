import { NextResponse } from "next/server"

import {
  AUTH_MESSAGES,
  SESSION_COOKIE_NAME,
  createSessionCookieValue,
  getSessionCookieOptions,
  isUnconfirmedEmail,
  validateCredentials,
} from "@/lib/auth"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        email?: string
        password?: string
      }
    | null

  const email = body?.email?.trim() ?? ""
  const password = body?.password ?? ""

  if (!email || !password) {
    return NextResponse.json(
      { message: AUTH_MESSAGES.missingCredentials },
      { status: 400 }
    )
  }

  if (isUnconfirmedEmail(email)) {
    return NextResponse.json(
      { message: AUTH_MESSAGES.emailNotConfirmed },
      { status: 403 }
    )
  }

  const user = validateCredentials(email, password)

  if (!user) {
    return NextResponse.json(
      { message: AUTH_MESSAGES.invalidCredentials },
      { status: 401 }
    )
  }

  const response = NextResponse.json({ ok: true, user })
  response.cookies.set(
    SESSION_COOKIE_NAME,
    createSessionCookieValue(user),
    getSessionCookieOptions()
  )

  return response
}
