import { NextResponse } from "next/server"

import { AUTH_MESSAGES, getAuthErrorMessage, validateLoginPayload } from "@/lib/auth"
import { normalizeEmail } from "@/lib/auth-validation"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        email?: string
        password?: string
      }
    | null

  const email = body?.email?.trim() ?? ""
  const password = body?.password ?? ""
  const { emailError, passwordError } = validateLoginPayload(email, password)

  if (emailError || passwordError) {
    return NextResponse.json(
      {
        message: emailError ?? passwordError ?? AUTH_MESSAGES.loginFailed,
        fieldErrors: {
          email: emailError,
          password: passwordError,
        },
      },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  })

  if (error) {
    const message = getAuthErrorMessage(error.message)

    return NextResponse.json(
      {
        message,
        fieldErrors: {
          email: message === AUTH_MESSAGES.invalidCredentials ? "" : undefined,
          password: message === AUTH_MESSAGES.invalidCredentials ? "" : undefined,
        },
      },
      { status: message === AUTH_MESSAGES.emailNotConfirmed ? 403 : 401 }
    )
  }

  return NextResponse.json({
    ok: true,
    user: data.user,
  })
}
