"use client"

import Link from "next/link"
import { AlertCircle, Eye, EyeOff } from "lucide-react"
import * as React from "react"

import { AuthShell } from "@/components/auth-shell"
import { getPasswordValidationMessage } from "@/lib/auth-validation"
import { createClient } from "@/lib/supabase/client"

type AlertState =
  | {
      tone: "error" | "success"
      message: string
    }
  | null

export function UpdatePasswordPage() {
  const supabase = React.useMemo(() => createClient(), [])
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [passwordError, setPasswordError] = React.useState("")
  const [confirmPasswordError, setConfirmPasswordError] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [alert, setAlert] = React.useState<AlertState>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextPasswordError = getPasswordValidationMessage(password)
    const nextConfirmPasswordError =
      password !== confirmPassword ? "Konfirmasi password belum sama." : ""

    setPasswordError(nextPasswordError)
    setConfirmPasswordError(nextConfirmPasswordError)
    setAlert(null)

    if (nextPasswordError || nextConfirmPasswordError) {
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) {
        setAlert({
          tone: "error",
          message: error.message,
        })
        return
      }

      setAlert({
        tone: "success",
        message: "Password berhasil diperbarui. Silakan login kembali.",
      })
      setPassword("")
      setConfirmPassword("")
    } catch {
      setAlert({
        tone: "error",
        message: "Tidak dapat memperbarui password saat ini.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      modeLabel="Update Password"
      title="Create a New Password"
      subtitle="Masukkan password baru untuk akun Anda. Password minimal harus 6 karakter."
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
            New Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimal 6 karakter"
              className={`h-12 w-full rounded-2xl border bg-white px-4 pr-12 text-base text-black outline-hidden transition focus:border-black ${
                passwordError ? "border-red-500 ring-1 ring-red-500" : "border-slate-200"
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
          {passwordError ? <p className="mt-2 text-sm text-red-500">{passwordError}</p> : null}
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-black">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Ulangi password baru"
              className={`h-12 w-full rounded-2xl border bg-white px-4 pr-12 text-base text-black outline-hidden transition focus:border-black ${
                confirmPasswordError
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
          {confirmPasswordError ? (
            <p className="mt-2 text-sm text-red-500">{confirmPasswordError}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-black px-4 py-3.5 text-base font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSubmitting ? "Updating password..." : "Update Password"}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-slate-500 sm:text-base">
        Back to{" "}
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
