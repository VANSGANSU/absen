const scheduleRows = [
  { label: "Check-in Pagi", time: "08:00 - 09:00", rule: "Auto Hadir sampai 08:15, setelah itu Terlambat." },
  { label: "Check-out Sore", time: "17:00 - 18:00", rule: "Quick absen aktif saat range berjalan." },
  { label: "Izin Manual", time: "Sepanjang hari", rule: "Operator dapat memilih Izin, Sakit, atau WFH secara manual." },
]

export default function DashboardSchedulePage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-black bg-white p-4 sm:p-6">
        <p className="text-sm font-medium text-black">Schedule</p>
        <h1 className="mt-2 text-2xl font-semibold text-black sm:text-3xl">Aturan Jadwal Absensi</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-black">
          Halaman ini menjelaskan bagaimana schedule mengaktifkan tombol quick absen dan bagaimana status otomatis ditentukan dari jam absen.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {scheduleRows.map((row) => (
          <article key={row.label} className="rounded-[1.75rem] border border-black bg-white p-4 sm:p-6">
            <p className="text-sm font-medium text-black">{row.label}</p>
            <h2 className="mt-3 text-2xl font-semibold text-black">{row.time}</h2>
            <p className="mt-3 text-sm leading-6 text-black">{row.rule}</p>
          </article>
        ))}
      </div>

      <section className="rounded-[1.75rem] border border-black bg-black p-4 text-white sm:p-6">
        <h2 className="text-xl font-semibold sm:text-2xl">Rule Status Otomatis</h2>
        <ul className="mt-4 space-y-3 text-sm leading-6">
          <li>Jika status dipilih `Auto`, sistem akan membaca jam absen dan mencocokkannya dengan range check-in.</li>
          <li>Jam check-in sampai 15 menit setelah mulai schedule akan dihitung sebagai `Hadir`.</li>
          <li>Jika melewati toleransi, status berubah menjadi `Terlambat`.</li>
          <li>Status `Izin`, `Sakit`, dan `WFH` tetap bisa dipilih manual sesuai kebutuhan operasional.</li>
        </ul>
      </section>
    </div>
  )
}
