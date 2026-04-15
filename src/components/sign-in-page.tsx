"use client"

import { AlertCircle, ArrowRight, Eye, EyeOff, Mail, Star } from "lucide-react"
import * as React from "react"

type AlertState =
  | {
      tone: "error" | "warning" | "success"
      message: string
    }
  | null

export function SignInPage() {
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [alert, setAlert] = React.useState<AlertState>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isResetSubmitting, setIsResetSubmitting] = React.useState(false)

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const result = (await response.json()) as {
        message?: string
      }

      if (!response.ok) {
        setAlert({
          tone: response.status === 403 ? "warning" : "error",
          message:
            result.message ?? "Terjadi kesalahan saat mencoba masuk ke aplikasi.",
        })
        return
      }

      setAlert(null)
      window.location.assign("/dashboard")
    } catch {
      setAlert({
        tone: "error",
        message: "Tidak dapat terhubung ke server. Coba lagi beberapa saat.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUnavailableFeature = () => {
    setAlert({
      tone: "warning",
      message: "Fitur ini belum tersedia pada demo saat ini.",
    })
  }

  const handleForgotPassword = async () => {
    setIsResetSubmitting(true)

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const result = (await response.json()) as {
        message?: string
      }

      setAlert({
        tone:
          response.status === 403
            ? "warning"
            : response.ok
              ? "success"
              : "error",
        message:
          result.message ?? "Terjadi kesalahan saat meminta reset password.",
      })
    } catch {
      setAlert({
        tone: "error",
        message: "Tidak dapat terhubung ke server. Coba lagi beberapa saat.",
      })
    } finally {
      setIsResetSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen max-w-[1320px] flex-col px-4 py-4 lg:flex-row lg:px-5 lg:py-5">
        <section className="relative hidden overflow-hidden rounded-[28px] border border-black bg-black p-8 text-white lg:flex lg:w-[43%] lg:flex-col lg:justify-between xl:p-10">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-3 rounded-full border border-white bg-black px-4 py-2 text-sm font-medium">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white bg-black text-sm">
                A
              </span>
              Absensi Community
            </div>

            <h1 className="mt-8 max-w-sm text-4xl font-semibold leading-[1.05] tracking-tight xl:text-[2.9rem]">
              Welcome to our community
            </h1>
          </div>

          <div className="relative z-10 max-w-md">
            <div className="mb-6 flex gap-2 text-white">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} className="size-5 fill-current" />
              ))}
            </div>

            <p className="text-xl leading-8 text-white xl:text-[1.35rem] xl:leading-9">
              Absensi solved our pain point the moment we started using it.
              Compared to other tools we&apos;d tested, Absensi is simple,
              easy, and synchronizes with the other applications we use.
            </p>

            <div className="mt-8 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-black text-base font-semibold">
                AS
              </div>
              <div>
                <p className="text-base font-semibold">Andriy Sambir</p>
                <p className="text-sm text-white">CEO at LinkUp</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-1 items-center justify-center lg:w-[57%] lg:px-6">
          <div className="w-full max-w-[520px] rounded-[24px] border border-black bg-white px-5 py-6 sm:px-7 sm:py-8 lg:min-h-[auto] lg:rounded-[28px] lg:px-9 lg:py-9">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-black text-sm font-bold text-white">
                  A
                </div>
                <span className="text-xl font-semibold tracking-tight text-black">
                  Absensi
                </span>
              </div>

              <span className="hidden rounded-full border border-black bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-black sm:inline-flex">
                Sign In
              </span>
            </div>

            <div className="mx-auto mt-7 max-w-[360px] sm:mt-10 sm:max-w-[380px]">
              <h2 className="text-center text-[1.9rem] font-semibold tracking-tight text-black sm:text-[2.45rem] sm:leading-[1.08]">
                Sign in to Absensi
              </h2>

              <p className="mt-3 text-center text-sm leading-6 text-black">
                Use `demo@absensi.com` with password `Absensi123!` for a
                successful login. Emails `pending@absensi.com`,
                `unconfirmed@absensi.com`, atau `coba87405@gmail.com` akan
                memunculkan validasi email belum terkonfirmasi.
              </p>

              {alert ? (
                <div
                  className="mt-5 flex gap-3 rounded-2xl border border-black bg-white px-4 py-3 text-sm leading-6 text-black"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{alert.message}</span>
                </div>
              ) : null}

              <form className="mt-6 space-y-4" onSubmit={handleSignIn}>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-black">
                    Work Email *
                  </span>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-black" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Enter email"
                      className="h-12 w-full rounded-2xl border border-black bg-white pl-11 pr-4 text-base text-black outline-none transition focus:ring-2 focus:ring-black"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-black">
                    Password *
                  </span>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter password"
                      className="h-12 w-full rounded-2xl border border-black bg-white px-4 pr-14 text-base text-black outline-none transition focus:ring-2 focus:ring-black"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-black transition hover:bg-black hover:text-white"
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                      <span className="sr-only">Toggle password visibility</span>
                    </button>
                  </div>
                </label>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isResetSubmitting}
                    className="text-sm font-medium text-black transition hover:underline"
                  >
                    {isResetSubmitting
                      ? "Sending reset email..."
                      : "Forgot your password?"}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-black px-4 text-base font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={handleUnavailableFeature}
                  className="inline-flex items-center gap-2 text-sm font-medium text-black underline-offset-4 transition hover:underline"
                >
                  Log in with SSO
                  <ArrowRight className="size-4" />
                </button>
              </div>

              <div className="mt-7 border-t border-black pt-7 text-center text-sm text-black sm:text-base">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={handleUnavailableFeature}
                  className="font-semibold text-black underline-offset-4 transition hover:underline"
                >
                  Get started
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
