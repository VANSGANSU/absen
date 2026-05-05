import { redirect } from "next/navigation"

import { SignInPage } from "@/components/(login)/sign-in-page"
import { getSessionUser } from "@/lib/auth"

export default async function LoginPage() {
  const user = await getSessionUser()

  if (user) {
    redirect("/dashboard")
  }

  return <SignInPage />
}
