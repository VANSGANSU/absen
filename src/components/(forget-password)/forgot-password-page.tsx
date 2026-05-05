"use client"

import Link from "next/link"
import { AlertCircle, Mail } from "lucide-react"
import * as React from "react"

import { AuthShell } from "@/components/auth-shell"
import { getEmailValidationMessage, normalizeEmail } from "@/lib/auth-validation"

type AlertState =
  | {
      tone: "error" | "success"
      message: string
    }
  | null

export function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("")
  const [emailError, setEmailError] = React.useState("")
  const [alert, setAlert] = React.useState<AlertState>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextEmailError = getEmailValidationMessage(email)
    setEmailError(nextEmailError)
    setAlert(null)

    if (nextEmailError) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizeEmail(email),
        }),
      })

      const result = (await response.json().catch(() => null)) as
        | {
            message?: string
            fieldErrors?: {
              email?: string
            }
          }
        | null

      if (!response.ok) {
        setEmailError(result?.fieldErrors?.email ?? "")
        setAlert({
          tone: "error",
          message: result?.message ?? "Tidak dapat mengirim reset password saat ini.",
        })
        return
      }

      setAlert({
        tone: "success",
        message:
          result?.message ??
          "Instruksi reset password sudah dikirim ke email Anda.",
      })
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
      modeLabel="Recovery"
      title="Reset Your Password"
      subtitle="Masukkan email yang terdaftar, lalu kami akan mengirimkan tautan untuk membuat password baru."
    >
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

      <form onSubmit={handleSubmit} className="space-y-5">
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
                emailError ? "border-red-500 ring-1 ring-red-500" : "border-slate-200"
              }`}
            />
          </div>
          {emailError ? <p className="mt-2 text-sm text-slate-600">{emailError}</p> : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-black px-4 py-3.5 text-base font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSubmitting ? "Sending reset link..." : "Send reset link"}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-slate-500 sm:text-base">
        Remember your password?{" "}
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
