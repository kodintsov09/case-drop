import { getSessionUserId } from "@/lib/auth/session"
import { toPublicUser } from "@/lib/auth/user"
import { prisma } from "@/lib/prisma"

export async function requireAuthUser() {
  const userId = await getSessionUserId()

  if (!userId) {
    return null
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) {
    return null
  }

  return user
}

export async function requirePublicUser() {
  const user = await requireAuthUser()
  return user ? toPublicUser(user) : null
}
