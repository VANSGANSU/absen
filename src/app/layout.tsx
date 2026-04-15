import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Absensi",
  description: "Aplikasi absensi dengan halaman autentikasi dan dashboard.",
}

export default function RootLayout(props: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{props.children}</body>
    </html>
  )
}
