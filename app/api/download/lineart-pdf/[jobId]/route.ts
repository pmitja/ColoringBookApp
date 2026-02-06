import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { PDFDocument } from "pdf-lib";
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
        inputFileName: true,
      },
    });

    if (!job || job.status !== "DONE" || !job.lineartUrl) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const upstream = await fetch(job.lineartUrl, { cache: "no-store" });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Failed to fetch line art" },
        { status: 502 }
      );
    }

    const contentType =
      upstream.headers.get("content-type") ?? "image/jpeg";
    const imageBytes = await upstream.arrayBuffer();

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size (8.5 x 11 in)
    const margin = 36; // 0.5 inch
    const maxWidth = page.getWidth() - margin * 2;
    const maxHeight = page.getHeight() - margin * 2;

    const embeddedImage = contentType.includes("png")
      ? await pdfDoc.embedPng(imageBytes)
      : await pdfDoc.embedJpg(imageBytes);

    const { width, height } = embeddedImage.scale(1);
    const scale = Math.min(maxWidth / width, maxHeight / height);
    const renderWidth = width * scale;
    const renderHeight = height * scale;
    const x = (page.getWidth() - renderWidth) / 2;
    const y = (page.getHeight() - renderHeight) / 2;

    page.drawImage(embeddedImage, {
      x,
      y,
      width: renderWidth,
      height: renderHeight,
    });

    const pdfBytes = await pdfDoc.save();

    const fileBaseName =
      job.inputFileName.split(".")[0] || "coloring-page";
    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set(
      "Content-Disposition",
      `attachment; filename=\"${fileBaseName}-coloring-page.pdf\"`
    );
    headers.set("Cache-Control", "private, max-age=3600");

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Lineart PDF download error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
