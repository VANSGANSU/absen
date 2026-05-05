"use client"

import * as React from "react"

export function AccountSettingsPage({ user }: { user: any }) {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-black bg-white p-4 sm:p-6">
        <p className="text-sm font-medium text-black">Settings</p>
        <h1 className="mt-2 text-2xl font-semibold text-black sm:text-3xl">Pengaturan Akun dan Sesi</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-black">
          Halaman ini menampilkan informasi akun aktif dan menjadi dasar untuk pengaturan berikutnya seperti preferensi notifikasi, keamanan, dan identitas operator.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-[1.75rem] border border-black bg-black p-4 text-white sm:p-6">
          <p className="text-sm font-medium">Akun Aktif</p>
          <h2 className="mt-3 text-2xl font-semibold">{user.name}</h2>
          <p className="mt-2 text-sm">{user.email}</p>
          <p className="mt-4 text-sm leading-6">
            Sesi login aktif ini digunakan untuk membuka semua route di dashboard.
          </p>
          <div className="mt-6 space-y-2 text-sm">
            <p>ID Pengguna: {user.id}</p>
            <p>Inisial: {user.initials}</p>
            <p>Status sesi: Aktif</p>
          </div>
        </article>
        <article className="rounded-[1.75rem] border border-black bg-white p-4 sm:p-6">
          <p className="text-sm font-medium text-black">Preferensi Demo</p>
          <h2 className="mt-3 text-2xl font-semibold text-black">Konfigurasi Saat Ini</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-black">
            <li>Theme: Black and white</li>
            <li>Route login: /auth/login</li>
            <li>Dashboard utama: /dashboard</li>
            <li>Sidebar: aktif dan terhubung ke halaman struktural</li>
            <li>Status absensi otomatis: aktif untuk mode Auto</li>
          </ul>
        </article>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[1.75rem] border border-black bg-white p-4 sm:p-6">
          <p className="text-sm font-medium text-black">Pengaturan Operasional</p>
          <h2 className="mt-3 text-2xl font-semibold text-black">
            Preferensi Absensi dan Notifikasi
          </h2>
          <div className="mt-6 space-y-4">
            {[
              {
                title: "Aktifkan status auto saat check-in",
                description:
                  "Sistem akan otomatis menentukan Hadir atau Terlambat dari jam absen.",
                enabled: true,
              },
              {
                title: "Kirim pengingat sebelum range schedule",
                description:
                  "Operator menerima pengingat ketika range quick absen akan dibuka.",
                enabled: true,
              },
              {
                title: "Tampilkan riwayat terbaru di dashboard utama",
                description:
                  "Riwayat absen terbaru tetap muncul pada workspace manual attendance.",
                enabled: true,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex flex-col gap-4 rounded-3xl border border-black p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <h3 className="font-semibold text-black">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-black">
                    {item.description}
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                    item.enabled
                      ? "border-black bg-black text-white"
                      : "border-black bg-white text-black"
                  }`}
                >
                  {item.enabled ? "On" : "Off"}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-black bg-white p-4 sm:p-6">
          <p className="text-sm font-medium text-black">Sistem & Keamanan</p>
          <h2 className="mt-3 text-2xl font-semibold text-black">
            Ringkasan Infrastruktur Demo
          </h2>
          <div className="mt-6 space-y-4">
            <div className="rounded-3xl border border-black bg-black p-5 text-white">
              <p className="text-sm">Metode Login</p>
              <p className="mt-3 text-2xl font-semibold">Email + Password</p>
            </div>
            <div className="rounded-3xl border border-black p-5">
              <p className="text-sm text-black">Session Cookie</p>
              <p className="mt-3 text-2xl font-semibold text-black">
                Terenkripsi
              </p>
            </div>
            <div className="rounded-3xl border border-black p-5">
              <p className="text-sm text-black">Validasi Login</p>
              <p className="mt-3 text-2xl font-semibold text-black">
                Aktif
              </p>
              <p className="mt-2 text-sm leading-6 text-black">
                Email belum konfirmasi dan kredensial salah sudah diproses pada
                halaman login.
              </p>
            </div>
          </div>
        </article>
      </section>
    </div>
  )
}
