import Link from "next/link"

const recapRows = [
  { name: "Demo Absensi", division: "Karyawan aktif", hadir: 4, terlambat: 1, izin: 0, sakit: 1, wfh: 1, total: 7 },
  { name: "Alya Putri", division: "Human Capital", hadir: 19, terlambat: 2, izin: 1, sakit: 0, wfh: 2, total: 24 },
  { name: "Rizky Pratama", division: "Finance", hadir: 18, terlambat: 1, izin: 0, sakit: 1, wfh: 3, total: 23 },
  { name: "Nadia Permata", division: "Operations", hadir: 20, terlambat: 0, izin: 1, sakit: 0, wfh: 2, total: 23 },
]

export default function DashboardRecapPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-black bg-white p-4 sm:p-6">
        <p className="text-sm font-medium text-black">Monthly Recap</p>
        <h1 className="mt-2 text-2xl font-semibold text-black sm:text-3xl">Rekap Bulanan Per Karyawan</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-black">
          Halaman ini merangkum performa kehadiran per karyawan. Untuk input dan perubahan data live, kamu bisa tetap masuk ke workspace manual attendance.
        </p>
        <Link href="/dashboard/attendance" className="mt-5 inline-flex rounded-2xl border border-black bg-black px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90">
          Buka Manual Attendance
        </Link>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border border-black bg-black p-5 text-white"><p className="text-sm">Karyawan Aktif</p><p className="mt-3 text-3xl font-semibold">4</p></article>
        <article className="rounded-3xl border border-black bg-white p-5"><p className="text-sm text-black">Rata-rata Hadir</p><p className="mt-3 text-3xl font-semibold text-black">76%</p></article>
        <article className="rounded-3xl border border-black bg-white p-5"><p className="text-sm text-black">Kasus Terlambat</p><p className="mt-3 text-3xl font-semibold text-black">4</p></article>
        <article className="rounded-3xl border border-black bg-white p-5"><p className="text-sm text-black">WFH Bulan Ini</p><p className="mt-3 text-3xl font-semibold text-black">8</p></article>
      </div>

      <section className="rounded-[1.75rem] border border-black bg-white">
        <div className="grid gap-4 p-4 lg:hidden">
          {recapRows.map((row) => (
            <article key={`${row.name}-mobile`} className="rounded-3xl border border-black bg-white p-4">
              <p className="font-semibold text-black">{row.name}</p>
              <p className="text-sm text-black">{row.division}</p>
              <p className="mt-1 text-sm text-black">Maret 2026</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-black">
                <p>Hadir: {row.hadir}</p>
                <p>Terlambat: {row.terlambat}</p>
                <p>Izin: {row.izin}</p>
                <p>Sakit: {row.sakit}</p>
                <p>WFH: {row.wfh}</p>
                <p className="font-semibold">Total: {row.total}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="hidden overflow-x-auto lg:block">
        <div className="min-w-[860px] grid-cols-[1.5fr_1fr_0.8fr_0.8fr_0.7fr_0.7fr_0.7fr_0.8fr] bg-black px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white lg:grid">
          <span>Karyawan</span>
          <span>Divisi</span>
          <span>Hadir</span>
          <span>Terlambat</span>
          <span>Izin</span>
          <span>Sakit</span>
          <span>WFH</span>
          <span>Total</span>
        </div>
        <div className="min-w-[860px] divide-y divide-black">
          {recapRows.map((row) => (
            <div key={row.name} className="grid gap-3 px-4 py-4 lg:grid-cols-[1.5fr_1fr_0.8fr_0.8fr_0.7fr_0.7fr_0.7fr_0.8fr] lg:items-center">
              <div><p className="font-semibold text-black">{row.name}</p><p className="text-sm text-black">Maret 2026</p></div>
              <div className="text-sm text-black">{row.division}</div>
              <div className="text-sm font-medium text-black">{row.hadir}</div>
              <div className="text-sm font-medium text-black">{row.terlambat}</div>
              <div className="text-sm font-medium text-black">{row.izin}</div>
              <div className="text-sm font-medium text-black">{row.sakit}</div>
              <div className="text-sm font-medium text-black">{row.wfh}</div>
              <div className="text-sm font-semibold text-black">{row.total}</div>
            </div>
          ))}
        </div>
        </div>
      </section>
    </div>
  )
}
