import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

interface Params {
  jobId: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const job = await prisma.imageJob.findFirst({
      where: {
        id: params.jobId,
        userId: user.id,
      },
      select: {
        status: true,
        lineartUrl: true,
      },
    });

    if (!job || job.status !== "DONE" || !job.lineartUrl) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const upstream = await fetch(job.lineartUrl, { cache: "no-store" });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: "Failed to fetch line art" },
        { status: 502 }
      );
    }

    const headers = new Headers();
    headers.set(
      "Content-Type",
      upstream.headers.get("content-type") ?? "image/jpeg"
    );
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }
    headers.set("Cache-Control", "private, max-age=3600");

    return new NextResponse(upstream.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Lineart download error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
