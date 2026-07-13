import { prisma } from "@/utils/prisma";
import { validateBuyerShippingProfile } from "./buyer-validation";

function formatShippingProfile(account) {
  if (!account?.defaultShippingAddress) return null;
  return {
    name: account.defaultShippingName || account.name || "",
    phone: account.defaultShippingPhone || account.phone || "",
    address: account.defaultShippingAddress,
    addressDetail: account.defaultShippingAddressDetail || "",
  };
}

export function formatBuyerMe(account, authUser = {}) {
  return {
    name: account.name || authUser.metadata?.name || "",
    email: account.email || authUser.email || "",
    role: "BUYER",
    shippingProfile: formatShippingProfile(account),
  };
}

export async function fetchBuyerMe({ account, authUser }) {
  return formatBuyerMe(account, authUser);
}

export async function updateBuyerShippingProfile({ userId, input }) {
  const clean = validateBuyerShippingProfile(input);
  const account = await prisma.user.update({
    where: { id: userId },
    data: {
      defaultShippingName: clean.name,
      defaultShippingPhone: clean.phone,
      defaultShippingAddress: clean.address,
      defaultShippingAddressDetail: clean.addressDetail,
    },
    select: {
      name: true,
      phone: true,
      defaultShippingName: true,
      defaultShippingPhone: true,
      defaultShippingAddress: true,
      defaultShippingAddressDetail: true,
    },
  });

  return { shippingProfile: formatShippingProfile(account) };
}
