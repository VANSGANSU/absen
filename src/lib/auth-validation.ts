export const MIN_PASSWORD_LENGTH = 6

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function getEmailValidationMessage(email: string) {
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail) {
    return "Email wajib diisi."
  }

  if (!normalizedEmail.includes("@")) {
    return "Email tidak valid. Pastikan menyertakan simbol '@'."
  }

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return "Email tidak valid. Gunakan format email yang benar."
  }

  return ""
}

export function getPasswordValidationMessage(password: string) {
  if (!password) {
    return "Password wajib diisi."
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`
  }

  return ""
}

export function getNameValidationMessage(name: string) {
  if (!name.trim()) {
    return "Nama wajib diisi."
  }

  if (name.trim().length < 2) {
    return "Nama minimal 2 karakter."
  }

  return ""
}
