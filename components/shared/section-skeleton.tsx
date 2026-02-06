import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonSection({ card = false }: { card?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <div className="space-y-2 md:col-span-5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-4/5" />
        </div>
        <div className="md:col-span-7">
          {card ? (
            <Skeleton className="h-44 w-full rounded-xl" />
          ) : (
            <>
              <div className="mb-1.5 flex gap-x-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-[67px] shrink-0 sm:w-[130px]" />
              </div>
              <Skeleton className="h-5 w-56" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
