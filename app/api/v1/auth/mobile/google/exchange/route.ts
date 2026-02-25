import { NextRequest, NextResponse } from "next/server";

import { createMobileSessionFromGoogle } from "@/lib/mobile-auth";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | {
          idToken?: unknown;
          code?: unknown;
          codeVerifier?: unknown;
          redirectUri?: unknown;
          platform?: unknown;
        }
      | null;

    const session = await createMobileSessionFromGoogle({
      idToken: typeof body?.idToken === "string" ? body.idToken : undefined,
      code: typeof body?.code === "string" ? body.code : undefined,
      codeVerifier:
        typeof body?.codeVerifier === "string" ? body.codeVerifier : undefined,
      redirectUri:
        typeof body?.redirectUri === "string" ? body.redirectUri : undefined,
      platform: typeof body?.platform === "string" ? body.platform : undefined,
    });

    return NextResponse.json(session, { status: 200 });
  } catch (error) {
    console.error("Mobile Google exchange failed:", error);
    const message = error instanceof Error ? error.message : "Authentication failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
