import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

import { BASE_STYLES, INTO_LINEART, type StyleId } from "@/config/prompts";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

type UploadVariant = "styled" | "lineart";
const EDIT_MODEL = "xai/grok-imagine-image/edit";

function getFalErrorDetails(error: unknown): string | null {
  const falError = error as any;
  const detail = falError?.body?.detail;
  if (!detail) return null;
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

async function uploadBufferToFalStorage(
  buffer: Buffer,
  fileType: string,
  jobId: string,
): Promise<string> {
  const ext = fileType.split("/")[1] || "png";
  const inputFile = new File([buffer], `source-${jobId}.${ext}`, {
    type: fileType,
  });
  return fal.storage.upload(inputFile);
}

// Configure FAL.AI
if (process.env.FAL_API_KEY) {
  fal.config({
    credentials: process.env.FAL_API_KEY,
  });
}

// Function to process a single job
async function processJob(
  jobId: string,
  originalImageBuffer: Buffer,
  fileType: string,
  style: StyleId,
) {
  try {
    // Get the job
    const job = await prisma.imageJob.findUnique({
      where: { id: jobId },
    });

    if (!job || job.status !== "QUEUED") {
      return;
    }

    // Mark job as processing
    await prisma.imageJob.update({
      where: { id: jobId },
      data: { status: "PROCESSING" },
    });

    // Upload source image to FAL storage and pass URL to the model.
    // xai/grok-imagine-image/edit rejects data URLs for image input.
    const sourceImageUrl = await uploadBufferToFalStorage(
      originalImageBuffer,
      fileType,
      jobId,
    );

    // Build the prompt with selected style
    const stylePrompt = BASE_STYLES[style];
    const finalStylePrompt =
      (stylePrompt ?? "").trim().length > 0
        ? (stylePrompt ?? "").trim()
        : BASE_STYLES.FAST;
    if (finalStylePrompt !== stylePrompt) {
      console.warn("Empty style prompt computed, applying fallback prompt");
    }
    console.log("stylePrompt", finalStylePrompt);
    // 1. Call FAL.AI for style transformation using the original image
    const styledResult = await fal.subscribe(EDIT_MODEL, {
      input: {
        prompt: finalStylePrompt,
        image_url: sourceImageUrl,
      } as any,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          console.log(
            "Style generation progress:",
            update.logs?.map((log) => log.message).join("\n"),
          );
        }
      },
    });
    console.log("FAL style requestId:", styledResult.requestId);

    const styledImageUrl = styledResult.data?.images?.[0]?.url;
    if (!styledImageUrl)
      throw new Error("No styled image returned from FAL.AI");

    // 2. Call FAL.AI for lineart using the styled image as base
    const lineartResult = await fal.subscribe(EDIT_MODEL, {
      input: {
        prompt: INTO_LINEART,
        image_url: styledImageUrl,
      } as any,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          console.log(
            "Lineart generation progress:",
            update.logs?.map((log) => log.message).join("\n"),
          );
        }
      },
    });
    console.log("FAL lineart requestId:", lineartResult.requestId);

    const lineartImageUrl = lineartResult.data?.images?.[0]?.url;
    if (!lineartImageUrl)
      throw new Error("No lineart image returned from FAL.AI");

    // 3. Upload both styled and lineart images to UploadThing for permanent storage
    const styledUrl = await fetchAndUploadToUploadThing(
      styledImageUrl,
      `styled-${jobId}.jpg`,
    );
    if (!styledUrl)
      throw new Error("Failed to upload styled image to UploadThing");

    const lineartUrl = await fetchAndUploadToUploadThing(
      lineartImageUrl,
      `lineart-${jobId}.png`,
      "lineart",
    );
    if (!lineartUrl)
      throw new Error("Failed to upload lineart image to UploadThing");

    // 4. Update job in DB with final results (no original image stored)
    await prisma.imageJob.update({
      where: { id: jobId },
      data: {
        status: "DONE",
        inputUrl: null, // No original image URL stored
        cartoonUrl: styledUrl,
        lineartUrl: lineartUrl,
        errorMessage: null,
      },
    });

    console.log(`Job ${jobId} completed successfully`);
  } catch (error) {
    const detail = getFalErrorDetails(error);
    console.error(`Error processing job ${jobId}:`, error);
    if (detail) {
      console.error(`FAL validation details for job ${jobId}:`, detail);
    }

    const baseMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorMessage = detail ? `${baseMessage} | detail: ${detail}` : baseMessage;

    await prisma.imageJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        errorMessage,
      },
    });
  }
}

async function fetchAndUploadToUploadThing(
  imageUrl: string,
  filename: string,
  variant: UploadVariant = "styled",
): Promise<string | null> {
  try {
    // Import UTApi and sharp only when needed
    const { UTApi } = await import("uploadthing/server");
    const sharp = await import("sharp");

    const utapi = new UTApi();

    // 1. Fetch the image from FAL.AI
    const response = await fetch(imageUrl);
    if (!response.ok)
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Optimize image for storage and downstream print quality
    const processedBuffer =
      variant === "lineart"
        ? await sharp
            .default(buffer)
            .resize({ width: 1200, height: 1200, fit: "inside" })
            .flatten({ background: "#ffffff" })
            .grayscale()
            .normalise()
            .threshold(215, { grayscale: true })
            .png({ compressionLevel: 9, palette: true })
            .toBuffer()
        : await sharp
            .default(buffer)
            .resize({ width: 1200, height: 1200, fit: "inside" })
            .jpeg({ quality: 80, progressive: true })
            .toBuffer();

    // 3. Convert to File
    const file = new File([processedBuffer], filename, {
      type: variant === "lineart" ? "image/png" : "image/jpeg",
    });

    // 4. Upload to UploadThing
    const uploadRes = await utapi.uploadFiles(file);
    if (uploadRes.error) throw new Error(uploadRes.error.message);
    return uploadRes.data.url;
  } catch (err) {
    console.error("Error uploading to UploadThing:", err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user exists in database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      console.error("User not found in database:", user.id);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if FAL API key is configured
    if (!process.env.FAL_API_KEY) {
      return NextResponse.json(
        { error: "FAL_API_KEY not configured" },
        { status: 500 },
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("image") as File;
    const style = (formData.get("style") as string) || "FAST";

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 },
      );
    }

    // Validate style
    if (!BASE_STYLES[style as StyleId]) {
      return NextResponse.json(
        { error: "Invalid style selected" },
        { status: 400 },
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an image." },
        { status: 400 },
      );
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 },
      );
    }

    // Convert file to buffer for processing
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create job in database without storing original image URL
    const job = await prisma.imageJob.create({
      data: {
        userId: user.id,
        inputFileName: file.name,
        inputUrl: null, // No original image URL stored
        status: "QUEUED",
      },
    });

    // Start processing the job immediately in the background
    process.nextTick(() => {
      processJob(job.id, buffer, file.type, style as StyleId);
    });

    // Return job ID immediately for redirect to processing page
    return NextResponse.json({
      jobId: job.id,
      message: "Job created successfully. Processing will begin shortly.",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
