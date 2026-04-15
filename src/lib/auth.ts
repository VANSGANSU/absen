import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export type SessionUser = {
  id: string
  name: string
  email: string
  avatar: string
  initials: string
}

type MockUserRecord = SessionUser & {
  password: string
  confirmed: boolean
}

type SessionPayload = {
  user: SessionUser
  expiresAt: number
}

const SESSION_DURATION_SECONDS = 60 * 60 * 8
const SESSION_SECRET =
  process.env.SESSION_SECRET ?? "absensi-dev-secret-change-this"

export const SESSION_COOKIE_NAME = "absensi_session"

export const AUTH_MESSAGES = {
  emailNotConfirmed:
    "You cannot login until you confirm your email address. We just emailed you a confirmation.",
  invalidCredentials: "Email atau password yang Anda masukkan salah.",
  resetSent:
    "Instruksi reset password sudah kami kirim ke email yang Anda masukkan.",
  missingResetEmail:
    "Masukkan email kerja terlebih dahulu sebelum meminta reset password.",
  missingCredentials: "Masukkan email dan password terlebih dahulu.",
} as const

const MOCK_USERS: MockUserRecord[] = [
  {
    id: "usr_demo_absensi",
    name: "Demo Absensi",
    email: "demo@absensi.com",
    password: "Absensi123!",
    confirmed: true,
    avatar: "",
    initials: "DA",
  },
  {
    id: "usr_pending_absensi",
    name: "Pending User",
    email: "pending@absensi.com",
    password: "Absensi123!",
    confirmed: false,
    avatar: "",
    initials: "PU",
  },
  {
    id: "usr_unconfirmed_absensi",
    name: "Unconfirmed User",
    email: "unconfirmed@absensi.com",
    password: "Absensi123!",
    confirmed: false,
    avatar: "",
    initials: "UU",
  },
  {
    id: "usr_coba_absensi",
    name: "Coba User",
    email: "coba87405@gmail.com",
    password: "Absensi123!",
    confirmed: false,
    avatar: "",
    initials: "CU",
  },
]

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function publicUserFromRecord(user: MockUserRecord): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    initials: user.initials,
  }
}

export function findMockUserByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email)

  return MOCK_USERS.find((user) => normalizeEmail(user.email) === normalizedEmail)
}

export function isUnconfirmedEmail(email: string) {
  const normalizedEmail = normalizeEmail(email)
  const matchedUser = findMockUserByEmail(normalizedEmail)

  if (matchedUser) {
    return !matchedUser.confirmed
  }

  return (
    normalizedEmail.includes("unconfirmed") ||
    normalizedEmail.includes("pending") ||
    normalizedEmail === "coba87405@gmail.com"
  )
}

export function validateCredentials(email: string, password: string) {
  const matchedUser = findMockUserByEmail(email)

  if (!matchedUser || matchedUser.password !== password || !matchedUser.confirmed) {
    return null
  }

  return publicUserFromRecord(matchedUser)
}

function signPayload(payload: string) {
  return createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url")
}

export function createSessionCookieValue(user: SessionUser) {
  const payload: SessionPayload = {
    user,
    expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000,
  }

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signature = signPayload(encodedPayload)

  return `${encodedPayload}.${signature}`
}

export function parseSessionCookieValue(cookieValue?: string) {
  if (!cookieValue) {
    return null
  }

  const [encodedPayload, signature] = cookieValue.split(".")

  if (!encodedPayload || !signature) {
    return null
  }

  const expectedSignature = signPayload(encodedPayload)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as SessionPayload

    if (!payload.user || payload.expiresAt <= Date.now()) {
      return null
    }

    return payload.user
  } catch {
    return null
  }
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  }
}

export async function getSessionUser() {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(SESSION_COOKIE_NAME)?.value

  return parseSessionCookieValue(cookieValue)
}

export async function requireSessionUser() {
  const user = await getSessionUser()

  if (!user) {
    redirect("/auth/login")
  }

  return user
}
