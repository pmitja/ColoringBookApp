import { Skeleton } from "@/components/ui/skeleton";
import { DashboardHeader } from "@/components/dashboard/header";
import { CardSkeleton } from "@/components/shared/card-skeleton";

export default function DashboardBillingLoading() {
  return (
    <>
      <DashboardHeader
        heading="Plan & Billing"
        text="Loading your plan and usage details."
      />
      <div className="grid gap-8">
        <Skeleton className="h-28 w-full rounded-2xl md:h-24" />
        <CardSkeleton />
      </div>
    </>
  );
}
