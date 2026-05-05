import "server-only"

import type { User } from "@supabase/supabase-js"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import {
  getEmailValidationMessage,
  getPasswordValidationMessage,
  normalizeEmail,
} from "@/lib/auth-validation"

export type SessionUser = {
  id: string
  name: string
  email: string
  avatar: string
  initials: string
}

export const AUTH_MESSAGES = {
  invalidCredentials: "Email atau password yang Anda masukkan salah.",
  emailNotConfirmed:
    "You cannot login until you confirm your email address. We just emailed you a confirmation.",
  loginFailed: "Terjadi kesalahan saat mencoba masuk ke aplikasi.",
  logoutFailed: "Terjadi kesalahan saat keluar dari aplikasi.",
  registerSuccess:
    "Akun berhasil dibuat. Silakan cek email Anda untuk konfirmasi sebelum login.",
  registerLoggedIn: "Akun berhasil dibuat dan Anda sudah masuk ke aplikasi.",
  resetSent:
    "Instruksi reset password sudah kami kirim ke email yang Anda masukkan.",
  updatePasswordSuccess: "Password berhasil diperbarui. Silakan login kembali.",
} as const

function getInitials(name: string, email: string) {
  const cleanedName = name.trim()

  if (cleanedName) {
    const parts = cleanedName.split(/\s+/).slice(0, 2)
    return parts.map((part) => part.charAt(0).toUpperCase()).join("")
  }

  return email.slice(0, 2).toUpperCase()
}

export function mapSupabaseUser(user: User): SessionUser {
  const metadata = user.user_metadata ?? {}
  const email = normalizeEmail(user.email ?? "")
  const name =
    typeof metadata.full_name === "string" && metadata.full_name.trim()
      ? metadata.full_name.trim()
      : email.split("@")[0] || "Absensi User"
  const avatar =
    typeof metadata.avatar_url === "string" ? metadata.avatar_url : ""

  return {
    id: user.id,
    name,
    email,
    avatar,
    initials: getInitials(name, email),
  }
}

export function getAuthErrorMessage(message?: string | null) {
  const normalizedMessage = (message ?? "").toLowerCase()

  if (!normalizedMessage) {
    return AUTH_MESSAGES.loginFailed
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return AUTH_MESSAGES.emailNotConfirmed
  }

  if (normalizedMessage.includes("invalid login credentials")) {
    return AUTH_MESSAGES.invalidCredentials
  }

  if (
    normalizedMessage.includes("password should be at least") ||
    normalizedMessage.includes("password is too short")
  ) {
    return getPasswordValidationMessage("12345")
  }

  return message ?? AUTH_MESSAGES.loginFailed
}

export function validateLoginPayload(email: string, password: string) {
  return {
    emailError: getEmailValidationMessage(email),
    passwordError: getPasswordValidationMessage(password),
  }
}

export async function getSessionUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user ? mapSupabaseUser(user) : null
}

export async function requireSessionUser() {
  const user = await getSessionUser()

  if (!user) {
    redirect("/auth/login")
  }

  return user
}
