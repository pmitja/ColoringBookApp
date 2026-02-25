import { NextRequest, NextResponse } from "next/server";

import { getMobileSessionMe } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getMobileSessionMe(request.headers);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(session, { status: 200 });
  } catch (error) {
    console.error("Mobile me failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 },
    );
  }
}
