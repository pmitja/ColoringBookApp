import "server-only";

import { cache } from "react";
import { auth } from "@/auth";
import { getMobileUserFromCurrentRequestHeaders } from "@/lib/mobile-auth";

export const getCurrentUser = cache(async () => {
  const mobileUser = await getMobileUserFromCurrentRequestHeaders();
  if (mobileUser) {
    return mobileUser;
  }

  const session = await auth();
  if (!session?.user) {
    return undefined;
  }
  return session.user;
});
