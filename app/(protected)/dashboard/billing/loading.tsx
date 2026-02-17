import { Skeleton } from "@/components/ui/skeleton";
import { DashboardHeader } from "@/components/dashboard/header";
import { CardSkeleton } from "@/components/shared/card-skeleton";

export default function DashboardBillingLoading() {
  return (
    <>
      <DashboardHeader
        heading="Plan & Billing"
        text="Manage your plan and monthly generation usage."
      />
      <div className="grid gap-8">
        <Skeleton className="h-28 w-full rounded-lg md:h-24" />
        <CardSkeleton />
      </div>
    </>
  );
}
