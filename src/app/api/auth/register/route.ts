import { NextResponse } from "next/server"

import { AUTH_MESSAGES, getAuthErrorMessage } from "@/lib/auth"
import {
  getEmailValidationMessage,
  getNameValidationMessage,
  getPasswordValidationMessage,
  normalizeEmail,
} from "@/lib/auth-validation"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        name?: string
        email?: string
        password?: string
      }
    | null

  const name = body?.name?.trim() ?? ""
  const email = body?.email?.trim() ?? ""
  const password = body?.password ?? ""

  const nameError = getNameValidationMessage(name)
  const emailError = getEmailValidationMessage(email)
  const passwordError = getPasswordValidationMessage(password)

  if (nameError || emailError || passwordError) {
    return NextResponse.json(
      {
        message: nameError || emailError || passwordError,
        fieldErrors: {
          name: nameError,
          email: emailError,
          password: passwordError,
        },
      },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const origin = new URL(request.url).origin
  const { data, error } = await supabase.auth.signUp({
    email: normalizeEmail(email),
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
      data: {
        full_name: name,
      },
    },
  })

  if (error) {
    return NextResponse.json(
      {
        message: getAuthErrorMessage(error.message),
      },
      { status: 400 }
    )
  }

  return NextResponse.json({
    ok: true,
    requiresEmailConfirmation: !data.session,
    message: data.session
      ? AUTH_MESSAGES.registerLoggedIn
      : AUTH_MESSAGES.registerSuccess,
  })
}
