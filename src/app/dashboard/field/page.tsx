const fieldActivities = [
  { title: "Kunjungan Lokasi A", status: "On Progress", note: "Monitoring check-in staf lapangan area timur." },
  { title: "Audit Kehadiran Cabang", status: "Scheduled", note: "Verifikasi data batch manual dari supervisor cabang." },
  { title: "Validasi Shift Mobile", status: "Completed", note: "Pencocokan jadwal lapangan dengan quick absen aktif." },
]

export default function DashboardFieldPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-black bg-white p-4 sm:p-6">
        <p className="text-sm font-medium text-black">Field Activity</p>
        <h1 className="mt-2 text-2xl font-semibold text-black sm:text-3xl">Aktivitas Tim Lapangan</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-black">
          Route ini disiapkan untuk kebutuhan absensi tim lapangan, verifikasi cabang, dan monitoring aktivitas di luar kantor utama.
        </p>
      </section>

      <div className="space-y-4">
        {fieldActivities.map((activity, index) => (
          <article key={activity.title} className={`rounded-[1.75rem] border border-black p-4 sm:p-6 ${index === 0 ? "bg-black text-white" : "bg-white text-black"}`}>
            <p className="text-sm font-medium">{activity.status}</p>
            <h2 className="mt-3 text-xl font-semibold sm:text-2xl">{activity.title}</h2>
            <p className="mt-3 text-sm leading-6">{activity.note}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
