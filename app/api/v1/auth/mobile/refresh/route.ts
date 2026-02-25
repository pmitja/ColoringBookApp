import { NextRequest, NextResponse } from "next/server";

import { refreshMobileSession } from "@/lib/mobile-auth";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { refreshToken?: unknown }
      | null;
    const refreshToken =
      typeof body?.refreshToken === "string" ? body.refreshToken : null;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Missing refreshToken" },
        { status: 400 },
      );
    }

    const nextSession = await refreshMobileSession(refreshToken);
    if (!nextSession) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    return NextResponse.json(
      {
        user: nextSession.user,
        usage: nextSession.usage,
        tokens: nextSession.tokens,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Mobile refresh failed:", error);
    return NextResponse.json(
      { error: "Failed to refresh session" },
      { status: 500 },
    );
  }
}
