import type { InventoryItem, Skin, User } from "@/lib/generated/prisma/client"
import { mapSkinToFrontend } from "@/lib/db/mappers"
import type { Skin as FrontendSkin } from "@/lib/case-battle"
import { prisma } from "@/lib/prisma"

export type InventorySkin = FrontendSkin & {
  inventoryItemId: string
}

export function mapInventoryItem(
  item: InventoryItem & { skin: Skin }
): InventorySkin {
  return {
    ...mapSkinToFrontend(item.skin),
    inventoryItemId: item.id,
  }
}

export async function getAvailableInventory(userId: string): Promise<InventorySkin[]> {
  const items = await prisma.inventoryItem.findMany({
    where: { userId, status: "AVAILABLE" },
    include: { skin: true },
    orderBy: { createdAt: "desc" },
  })

  return items.map(mapInventoryItem)
}

export async function createLiveDrop(
  user: Pick<User, "id" | "username" | "displayName" | "avatar">,
  skin: Skin
) {
  const mapped = mapSkinToFrontend(skin)

  return prisma.liveDrop.create({
    data: {
      userId: user.id,
      skinId: skin.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      skinName: skin.name,
      weaponLabel: mapped.weapon,
      rarity: skin.rarity,
      price: skin.price,
      image: skin.image,
      weaponType: skin.weaponType,
    },
  })
}
