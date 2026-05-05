import { Skeleton } from "@/components/ui/skeleton";
import { DashboardHeader } from "@/components/dashboard/header";

export default function DashboardLoading() {
  return (
    <>
      <DashboardHeader heading="Dashboard" text="Loading your workspace..." />

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <Skeleton className="h-[210px] rounded-2xl" />
        <Skeleton className="h-[210px] rounded-2xl" />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-24 rounded-3xl" />
        <Skeleton className="h-24 rounded-3xl" />
        <Skeleton className="h-24 rounded-3xl" />
        <Skeleton className="h-24 rounded-3xl" />
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <Skeleton className="h-[340px] rounded-2xl" />
      </div>
    </>
  );
}
