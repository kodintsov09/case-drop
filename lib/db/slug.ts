export function slugify(text: string): string {
  const cyrillicMap: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
    з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
    п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
    ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
    я: "ya",
  }

  const transliterated = text
    .toLowerCase()
    .split("")
    .map((char) => cyrillicMap[char] ?? char)
    .join("")

  return transliterated
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "case"
}

export async function uniqueCaseSlug(
  baseName: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  const base = slugify(baseName)
  let slug = base
  let counter = 1

  while (await exists(slug)) {
    slug = `${base}-${counter}`
    counter += 1
  }

  return slug
}
