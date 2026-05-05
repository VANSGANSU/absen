import { redirect } from "next/navigation"

import { RegisterPage } from "@/components/(register)/register-page"
import { getSessionUser } from "@/lib/auth"

export default async function AuthRegisterPage() {
  const user = await getSessionUser()

  if (user) {
    redirect("/dashboard")
  }

  return <RegisterPage />
}
