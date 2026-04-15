import { NextResponse } from "next/server"

import { AUTH_MESSAGES, isUnconfirmedEmail } from "@/lib/auth"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        email?: string
      }
    | null

  const email = body?.email?.trim() ?? ""

  if (!email) {
    return NextResponse.json(
      { message: AUTH_MESSAGES.missingResetEmail },
      { status: 400 }
    )
  }

  if (isUnconfirmedEmail(email)) {
    return NextResponse.json(
      { message: AUTH_MESSAGES.emailNotConfirmed },
      { status: 403 }
    )
  }

  return NextResponse.json({ ok: true, message: AUTH_MESSAGES.resetSent })
}
