"use client"

import Link from "next/link"
import { Command } from "lucide-react"
import * as React from "react"

type AuthShellProps = {
  modeLabel: string
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function AuthShell({
  modeLabel,
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-6 sm:px-6">
      <div className="w-full max-w-[34rem] rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white">
            <Command className="size-6" />
          </div>
          <span className="mb-4 inline-flex rounded-full border border-slate-200 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            {modeLabel}
          </span>
          <h1 className="text-[2rem] font-semibold tracking-tight text-black sm:text-[2.5rem]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-3 max-w-[28rem] text-sm leading-6 text-slate-500 sm:text-base">
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className="mt-8">{children}</div>

        {footer ? <div className="mt-7 text-center">{footer}</div> : null}

        <div className="mt-6 text-center text-xs text-slate-400">
          <Link href="/auth/login" className="transition hover:text-black">
            Absensi
          </Link>
        </div>
      </div>
    </main>
  )
}
