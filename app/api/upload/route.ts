import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

import { BASE_STYLES, INTO_LINEART, type StyleId } from "@/config/prompts";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  getCurrentMonthStartUtc,
  getUserMonthlyGenerationUsage,
  resolveGenerationPlanLimit,
} from "@/lib/subscription";

type UploadVariant = "styled" | "lineart";
const EDIT_MODEL = "xai/grok-imagine-image/edit";
const MAX_BATCH_COUNT = 5;

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
  isUpscaled: boolean,
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
      "styled",
      isUpscaled,
    );
    if (!styledUrl)
      throw new Error("Failed to upload styled image to UploadThing");

    const lineartUrl = await fetchAndUploadToUploadThing(
      lineartImageUrl,
      `lineart-${jobId}.png`,
      "lineart",
      isUpscaled,
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
        isUpscaled,
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
  isUpscaled = false,
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
    const targetResolution = isUpscaled ? 2200 : 1200;

    const processedBuffer =
      variant === "lineart"
        ? await sharp
            .default(buffer)
            .resize({
              width: targetResolution,
              height: targetResolution,
              fit: "inside",
            })
            .flatten({ background: "#ffffff" })
            .grayscale()
            .normalise()
            .threshold(215, { grayscale: true })
            .png({ compressionLevel: 9, palette: true })
            .toBuffer()
        : await sharp
            .default(buffer)
            .resize({
              width: targetResolution,
              height: targetResolution,
              fit: "inside",
            })
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

function parseBooleanField(value: FormDataEntryValue | null): boolean | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();

  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return null;
}

function parseBatchCount(value: FormDataEntryValue | null): number {
  if (typeof value !== "string") return 1;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.min(parsed, MAX_BATCH_COUNT));
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    const userId = user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user exists in database
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        stripePriceId: true,
        stripeCurrentPeriodEnd: true,
      },
    });

    if (!dbUser) {
      console.error("User not found in database:", userId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isPaidUser =
      Boolean(dbUser.stripePriceId) &&
      Boolean(dbUser.stripeCurrentPeriodEnd) &&
      (dbUser.stripeCurrentPeriodEnd?.getTime() ?? 0) + 86_400_000 >
        Date.now();

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
    const requestedPrivate = parseBooleanField(formData.get("private"));
    const requestedUpscale = parseBooleanField(formData.get("upscale"));
    const batchCount = parseBatchCount(formData.get("batchCount"));

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

    const isPrivate =
      requestedPrivate === null ? isPaidUser : requestedPrivate;
    if (isPrivate && !isPaidUser) {
      return NextResponse.json(
        { error: "Private mode is available for paid plans only." },
        { status: 403 },
      );
    }

    const isUpscaled = requestedUpscale ?? false;
    if (isUpscaled && !isPaidUser) {
      return NextResponse.json(
        { error: "Upscale is available for paid plans only." },
        { status: 403 },
      );
    }

    const planLimits = resolveGenerationPlanLimit(dbUser);
    const usedThisMonth = await getUserMonthlyGenerationUsage(
      userId,
      getCurrentMonthStartUtc(),
    );
    const remainingThisMonth = Math.max(
      planLimits.monthlyGenerationLimit - usedThisMonth,
      0,
    );

    if (batchCount > remainingThisMonth) {
      return NextResponse.json(
        {
          error:
            remainingThisMonth <= 0
              ? `You have no generations left this month on the ${planLimits.planTitle} plan. Upgrade to a higher plan to keep generating.`
              : `You only have ${remainingThisMonth} generation${remainingThisMonth === 1 ? "" : "s"} left this month on the ${planLimits.planTitle} plan. Reduce batch size or upgrade to a higher plan.`,
        },
        { status: 403 },
      );
    }

    // Convert file to buffer for processing
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileBaseName = file.name.replace(/\.[^/.]+$/, "");
    const fileExtension = file.name.split(".").pop() || "png";
    const jobs = await Promise.all(
      Array.from({ length: batchCount }).map((_, index) =>
        prisma.imageJob.create({
          data: {
            userId,
            inputFileName:
              batchCount > 1
                ? `${fileBaseName}-${index + 1}.${fileExtension}`
                : file.name,
            inputUrl: null, // No original image URL stored
            status: "QUEUED",
            isPublic: !isPrivate,
            isUpscaled,
          },
        }),
      ),
    );

    for (const job of jobs) {
      process.nextTick(() => {
        processJob(job.id, buffer, file.type, style as StyleId, isUpscaled);
      });
    }

    const [firstJob] = jobs;
    if (!firstJob) {
      return NextResponse.json(
        { error: "Failed to create generation job." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      jobId: firstJob.id,
      jobIds: jobs.map((job) => job.id),
      batchCount: jobs.length,
      message:
        jobs.length > 1
          ? `${jobs.length} jobs created successfully. Processing started.`
          : "Job created successfully. Processing will begin shortly.",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
