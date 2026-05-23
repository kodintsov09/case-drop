import "dotenv/config"
import { fetchSteamProfile } from "../lib/auth/steam"
import { prisma } from "../lib/prisma"

async function main() {
  const steamId = process.argv[2] ?? "76561199438964221"
  const profile = await fetchSteamProfile(steamId)
  console.log("profile", profile)

  const user = await prisma.user.findUnique({ where: { steamId } })
  if (!user) {
    console.log("user not found in db")
    return
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      displayName: profile.personaname,
      avatar: profile.avatarfull,
    },
  })

  console.log("updated", updated.displayName, updated.avatar)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
