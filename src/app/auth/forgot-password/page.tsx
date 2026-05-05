import { redirect } from "next/navigation"

import { ForgotPasswordPage } from "@/components/(forget-password)/forgot-password-page"
import { getSessionUser } from "@/lib/auth"

export default async function AuthForgotPasswordPage() {
  const user = await getSessionUser()

  if (user) {
    redirect("/dashboard")
  }

  return <ForgotPasswordPage />
}
