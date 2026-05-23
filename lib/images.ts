/** Нормализует URL картинки для отображения и хранения. */
export function normalizeImageUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  const url = raw.trim()
  if (!url) return null

  if (url.startsWith("//")) {
    return `https:${url}`
  }

  if (/^https?:\/\//i.test(url)) {
    return url
  }

  return null
}

export function isDisplayableImageUrl(raw: string | null | undefined): boolean {
  return normalizeImageUrl(raw) !== null
}

export function isInvalidStoredImageUrl(raw: string | null | undefined): boolean {
  if (!raw) return true
  const trimmed = raw.trim().toLowerCase()
  return trimmed.startsWith("blob:") || trimmed.startsWith("data:")
}

export const IMAGE_URL_VALIDATION_ERROR =
  "Укажите прямую ссылку на картинку (https://…). Ссылки blob: и вставки из буфера не сохраняются — скопируйте URL изображения из браузера."
