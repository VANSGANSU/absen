import Link from "next/link"

export default function Home() {
  return (
    <main className="min-h-screen bg-white px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col justify-center gap-10 lg:flex-row lg:items-center lg:justify-between">
        <section className="max-w-2xl">
          <div className="inline-flex items-center gap-3 rounded-full border border-black bg-white px-4 py-2 text-sm font-medium text-black">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-black font-bold text-white">
              A
            </span>
            Absensi
          </div>

          <h1 className="mt-8 max-w-xl text-4xl font-semibold tracking-tight text-black sm:text-5xl lg:text-6xl sm:leading-[1.05]">
            Employee attendance and authentication workspace
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-black sm:text-lg sm:leading-8">
            Halaman login sekarang dipisah ke route auth agar alur aplikasi
            lebih rapi. Dari sini kamu bisa masuk ke halaman sign in atau
            langsung melihat dashboard contoh.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/auth/login"
              className="inline-flex h-14 items-center justify-center rounded-2xl bg-black px-8 text-lg font-semibold text-white transition hover:opacity-90"
            >
              Open Login Page
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-14 items-center justify-center rounded-2xl border border-black bg-white px-8 text-lg font-semibold text-black transition hover:bg-black hover:text-white"
            >
              View Dashboard
            </Link>
          </div>
        </section>

        <section className="w-full max-w-xl rounded-[32px] border border-black bg-white p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-3xl bg-black p-6 text-white">
              <p className="text-sm font-medium text-white">Auth Route</p>
              <p className="mt-4 text-3xl font-semibold">/auth/login</p>
              <p className="mt-3 text-sm leading-6 text-white">
                Halaman sign in dipisah ke folder auth agar struktur route lebih
                jelas.
              </p>
            </article>
            <article className="rounded-3xl border border-black bg-white p-6">
              <p className="text-sm font-medium text-black">Available Test</p>
              <p className="mt-4 text-3xl font-semibold text-black">
                Validation Ready
              </p>
              <p className="mt-3 text-sm leading-6 text-black">
                Skenario email belum konfirmasi dan kredensial salah tetap bisa
                diuji dari halaman login baru.
              </p>
            </article>
          </div>
        </section>
      </div>
    </main>
  )
}
