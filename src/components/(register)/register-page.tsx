"use client"

import Link from "next/link"
import { AlertCircle, Eye, EyeOff, Mail, UserRound } from "lucide-react"
import * as React from "react"

import { AuthShell } from "@/components/auth-shell"
import {
  getEmailValidationMessage,
  getNameValidationMessage,
  getPasswordValidationMessage,
  normalizeEmail,
} from "@/lib/auth-validation"
import { createClient } from "@/lib/supabase/client"

type FieldErrors = {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
}

type AlertState =
  | {
      tone: "error" | "success"
      message: string
    }
  | null

export function RegisterPage() {
  const supabase = React.useMemo(() => createClient(), [])
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})
  const [alert, setAlert] = React.useState<AlertState>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isGoogleSubmitting, setIsGoogleSubmitting] = React.useState(false)

  const handleGoogleSignIn = async () => {
    setAlert(null)
    setIsGoogleSubmitting(true)

    try {
      const origin = window.location.origin
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=/dashboard`,
        },
      })

      if (error) {
        setAlert({
          tone: "error",
          message: error.message,
        })
        return
      }

      if (data.url) {
        window.location.assign(data.url)
      }
    } catch {
      setAlert({
        tone: "error",
        message: "Tidak dapat memulai registrasi Google saat ini.",
      })
    } finally {
      setIsGoogleSubmitting(false)
    }
  }

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextFieldErrors: FieldErrors = {
      name: getNameValidationMessage(name) || undefined,
      email: getEmailValidationMessage(email) || undefined,
      password: getPasswordValidationMessage(password) || undefined,
      confirmPassword:
        password !== confirmPassword ? "Konfirmasi password belum sama." : undefined,
    }

    setFieldErrors(nextFieldErrors)
    setAlert(null)

    if (
      nextFieldErrors.name ||
      nextFieldErrors.email ||
      nextFieldErrors.password ||
      nextFieldErrors.confirmPassword
    ) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: normalizeEmail(email),
          password,
        }),
      })

      const result = (await response.json().catch(() => null)) as
        | {
            message?: string
            requiresEmailConfirmation?: boolean
            fieldErrors?: FieldErrors
          }
        | null

      if (!response.ok) {
        setFieldErrors((current) => ({
          ...current,
          ...result?.fieldErrors,
        }))
        setAlert({
          tone: "error",
          message: result?.message ?? "Tidak dapat membuat akun saat ini.",
        })
        return
      }

      setAlert({
        tone: "success",
        message:
          result?.message ??
          "Akun berhasil dibuat. Silakan cek email Anda untuk konfirmasi.",
      })

      if (!result?.requiresEmailConfirmation) {
        window.location.assign("/dashboard")
      }
    } catch {
      setAlert({
        tone: "error",
        message: "Tidak dapat terhubung ke server. Coba lagi beberapa saat.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      modeLabel="Register"
      title="Create Your Account"
      subtitle="Daftarkan akun baru dengan email yang valid dan password minimal 6 karakter."
    >
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isGoogleSubmitting}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.11c-.22-.66-.35-1.36-.35-2.11s.13-1.45.35-2.11V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.83z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.83c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        {isGoogleSubmitting ? "Connecting to Google..." : "Continue with Google"}
      </button>

      <div className="relative my-7">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-[0.18em] text-slate-400">
          <span className="bg-white px-4">Or continue with email</span>
        </div>
      </div>

      {alert ? (
        <div
          className={`mb-5 flex gap-3 rounded-2xl border px-4 py-3 text-sm leading-6 ${
            alert.tone === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{alert.message}</span>
        </div>
      ) : null}

      <form onSubmit={handleRegister} className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-semibold text-black">Full Name</label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your full name"
              className={`h-12 w-full rounded-2xl border bg-white pl-11 pr-4 text-base text-black outline-hidden transition focus:border-black ${
                fieldErrors.name ? "border-red-500 ring-1 ring-red-500" : "border-slate-200"
              }`}
            />
          </div>
          {fieldErrors.name ? (
            <p className="mt-2 text-sm text-red-500">{fieldErrors.name}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-black">
            Email Address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className={`h-12 w-full rounded-2xl border bg-white pl-11 pr-4 text-base text-black outline-hidden transition focus:border-black ${
                fieldErrors.email
                  ? "border-red-500 ring-1 ring-red-500"
                  : "border-slate-200"
              }`}
            />
          </div>
          {fieldErrors.email ? (
            <p className="mt-2 text-sm text-slate-600">{fieldErrors.email}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-black">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimal 6 karakter"
              className={`h-12 w-full rounded-2xl border bg-white px-4 pr-12 text-base text-black outline-hidden transition focus:border-black ${
                fieldErrors.password
                  ? "border-red-500 ring-1 ring-red-500"
                  : "border-slate-200"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-black"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              <span className="sr-only">Toggle password visibility</span>
            </button>
          </div>
          {fieldErrors.password ? (
            <p className="mt-2 text-sm text-red-500">{fieldErrors.password}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-black">
            Confirm Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Ulangi password"
              className={`h-12 w-full rounded-2xl border bg-white px-4 pr-12 text-base text-black outline-hidden transition focus:border-black ${
                fieldErrors.confirmPassword
                  ? "border-red-500 ring-1 ring-red-500"
                  : "border-slate-200"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((current) => !current)}
              className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-black"
            >
              {showConfirmPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
              <span className="sr-only">Toggle confirm password visibility</span>
            </button>
          </div>
          {fieldErrors.confirmPassword ? (
            <p className="mt-2 text-sm text-red-500">{fieldErrors.confirmPassword}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-black px-4 py-3.5 text-base font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSubmitting ? "Creating account..." : "Register"}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-slate-500 sm:text-base">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="font-semibold text-black transition hover:underline"
        >
          Login
        </Link>
      </p>
    </AuthShell>
  )
}
