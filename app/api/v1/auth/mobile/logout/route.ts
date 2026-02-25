import { NextRequest, NextResponse } from "next/server";

import { revokeRefreshToken } from "@/lib/mobile-auth";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { refreshToken?: unknown }
      | null;
    const refreshToken =
      typeof body?.refreshToken === "string" ? body.refreshToken : null;

    await revokeRefreshToken(refreshToken);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Mobile logout failed:", error);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
