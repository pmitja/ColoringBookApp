import { auth } from "@/auth";

import { prisma } from "@/lib/db";
import { getMobileUserFromBearerHeaders } from "@/lib/mobile-auth";

export const DELETE = auth(async (req) => {
  const mobileUser = await getMobileUserFromBearerHeaders(req.headers);
  const currentUser = req.auth?.user ?? mobileUser;
  if (!currentUser) {
    return new Response("Invalid user", { status: 401 });
  }

  try {
    await prisma.user.delete({
      where: {
        id: currentUser.id,
      },
    });
  } catch (error) {
    return new Response("Internal server error", { status: 500 });
  }

  return new Response("User deleted successfully!", { status: 200 });
});
