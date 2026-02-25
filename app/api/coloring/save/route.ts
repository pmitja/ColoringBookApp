import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getMobileUserFromBearerHeaders } from "@/lib/mobile-auth";

function stripFileExtension(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, "");
}

function sanitizeFileBaseName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");
}

export const POST = auth(async (request) => {
  const mobileUser = await getMobileUserFromBearerHeaders(request.headers);
  const userId = request.auth?.user?.id ?? mobileUser?.id;
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new Response("Invalid form data", { status: 400 });
  }

  const fileEntry = formData.get("file");
  const sourceJobIdEntry = formData.get("sourceJobId");

  if (!(fileEntry instanceof File)) {
    return new Response("Missing file", { status: 400 });
  }

  if (!fileEntry.type.startsWith("image/")) {
    return new Response("Only image files are allowed", { status: 400 });
  }

  if (fileEntry.size > 12 * 1024 * 1024) {
    return new Response("Image is too large", { status: 413 });
  }

  const sourceJobId =
    typeof sourceJobIdEntry === "string" ? sourceJobIdEntry : null;

  const sourceJob = sourceJobId
    ? await prisma.imageJob.findFirst({
        where: {
          id: sourceJobId,
          userId,
        },
        select: {
          id: true,
          inputFileName: true,
          lineartUrl: true,
        },
      })
    : null;

  if (sourceJobId && !sourceJob) {
    return new Response("Source image not found", { status: 404 });
  }

  try {
    const { UTApi } = await import("uploadthing/server");
    const utapi = new UTApi();

    const sourceName =
      sourceJob?.inputFileName ?? fileEntry.name ?? "colored-page";
    const safeBaseName = sanitizeFileBaseName(stripFileExtension(sourceName));
    const fileName = `${safeBaseName || "colored-page"}-${Date.now()}.png`;

    const buffer = await fileEntry.arrayBuffer();
    const uploadFile = new File([buffer], fileName, { type: "image/png" });
    const uploadResult = await utapi.uploadFiles(uploadFile);

    if (uploadResult.error || !uploadResult.data?.url) {
      throw new Error(uploadResult.error?.message ?? "Upload failed");
    }

    const creation = await prisma.imageJob.create({
      data: {
        userId,
        inputFileName: `${safeBaseName || "colored-page"}-colored.png`,
        inputUrl: sourceJob?.lineartUrl ?? null,
        lineartUrl: uploadResult.data.url,
        status: "DONE",
        isPublic: false,
        isUpscaled: false,
        cartoonUrl: null,
        errorMessage: null,
      },
      select: {
        id: true,
        inputFileName: true,
        lineartUrl: true,
        createdAt: true,
      },
    });

    return Response.json({
      id: creation.id,
      inputFileName: creation.inputFileName,
      lineartUrl: creation.lineartUrl,
      createdAt: creation.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Failed to save colored page:", error);
    return new Response("Failed to save colored image", { status: 500 });
  }
});
