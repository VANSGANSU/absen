import { NextResponse } from "next/server"

import { AUTH_MESSAGES } from "@/lib/auth"
import { getEmailValidationMessage, normalizeEmail } from "@/lib/auth-validation"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        email?: string
      }
    | null

  const email = body?.email?.trim() ?? ""
  const emailError = getEmailValidationMessage(email)

  if (emailError) {
    return NextResponse.json(
      {
        message: emailError,
        fieldErrors: {
          email: emailError,
        },
      },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const origin = new URL(request.url).origin
  const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
    redirectTo: `${origin}/auth/update-password`,
  })

  if (error) {
    return NextResponse.json(
      { message: error.message },
      { status: 400 }
    )
  }

  return NextResponse.json({
    ok: true,
    message: AUTH_MESSAGES.resetSent,
  })
}
