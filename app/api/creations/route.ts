import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getMobileUserFromBearerHeaders } from "@/lib/mobile-auth";

type CreationStatus = "QUEUED" | "PROCESSING" | "DONE" | "FAILED";
type FilterStatus = "all" | CreationStatus;
type SortMode = "newest" | "oldest" | "name";

const extractUploadThingKey = (url?: string | null) => {
  if (!url) return null;
  if (!url.includes("://")) return url;
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/f\/([^/?#]+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
};

export const GET = auth(async (req) => {
  const mobileUser = await getMobileUserFromBearerHeaders(req.headers);
  const userId = req.auth?.user?.id ?? mobileUser?.id;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const statusRaw = (req.nextUrl.searchParams.get("status") ?? "all").trim();
  const sortRaw = (req.nextUrl.searchParams.get("sort") ?? "newest").trim();

  const status: FilterStatus =
    statusRaw === "DONE" ||
    statusRaw === "PROCESSING" ||
    statusRaw === "FAILED" ||
    statusRaw === "QUEUED"
      ? statusRaw
      : "all";
  const sort: SortMode =
    sortRaw === "oldest" || sortRaw === "name" ? sortRaw : "newest";

  const creations = await prisma.imageJob.findMany({
    where: {
      userId,
      AND: [
        q
          ? {
              inputFileName: {
                contains: q,
                mode: "insensitive",
              },
            }
          : {},
        status !== "all" ? { status } : {},
      ],
    },
    orderBy:
      sort === "name"
        ? { inputFileName: "asc" }
        : { createdAt: sort === "oldest" ? "asc" : "desc" },
    take: 50,
    select: {
      id: true,
      inputFileName: true,
      lineartUrl: true,
      status: true,
      createdAt: true,
    },
  });

  return Response.json({
    creations: creations.map((creation) => ({
      id: creation.id,
      inputFileName: creation.inputFileName,
      lineartUrl: creation.lineartUrl,
      status: creation.status,
      createdAt: creation.createdAt.toISOString(),
    })),
  });
});

export const DELETE = auth(async (req) => {
  const mobileUser = await getMobileUserFromBearerHeaders(req.headers);
  const userId = req.auth?.user?.id ?? mobileUser?.id;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  let payload: { ids?: unknown } | null = null;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const ids = Array.isArray(payload?.ids)
    ? payload?.ids.filter(
        (id): id is string => typeof id === "string" && id.trim().length > 0,
      )
    : [];
  const uniqueIds = Array.from(new Set(ids));

  if (uniqueIds.length === 0) {
    return new Response("No ids provided", { status: 400 });
  }

  const jobs = await prisma.imageJob.findMany({
    where: {
      id: { in: uniqueIds },
      userId,
    },
    select: {
      id: true,
      lineartUrl: true,
      cartoonUrl: true,
      inputUrl: true,
    },
  });

  if (jobs.length === 0) {
    return new Response("Not Found", { status: 404 });
  }

  const fileKeys = new Set<string>();
  jobs.forEach((job) => {
    [job.lineartUrl, job.cartoonUrl, job.inputUrl].forEach((url) => {
      const key = extractUploadThingKey(url);
      if (key) fileKeys.add(key);
    });
  });

  let storageDeletedCount = 0;
  let storageError: string | null = null;

  if (fileKeys.size > 0) {
    try {
      const { UTApi } = await import("uploadthing/server");
      const utapi = new UTApi();
      const result = await utapi.deleteFiles(Array.from(fileKeys));
      storageDeletedCount = result.deletedCount;
      if (!result.success) {
        storageError = "Some files could not be deleted from storage.";
      }
    } catch (error) {
      console.error("Failed to delete UploadThing files:", error);
      storageError = "Failed to delete files from storage.";
    }
  }

  const deleteResult = await prisma.imageJob.deleteMany({
    where: {
      id: { in: jobs.map((job) => job.id) },
      userId,
    },
  });

  return Response.json({
    deletedCount: deleteResult.count,
    storageDeletedCount,
    storageError,
  });
});
