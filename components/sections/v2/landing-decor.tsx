import Image from "next/image";

import { cn } from "@/lib/utils";
import { Icons } from "@/components/shared/icons";

type LandingDecorProps = {
  variant?: "hero" | "lavender" | "peach" | "yellow" | "cta";
  className?: string;
};

const variantGlows = {
  hero: "from-[#f2eaff] via-[#fff4d7] to-[#ffe8ef]",
  lavender: "from-[#f3efff] via-white to-[#fff7df]",
  peach: "from-[#fff1e5] via-white to-[#f3efff]",
  yellow: "from-[#fff7ce] via-white to-[#f3efff]",
  cta: "from-[#f0e8ff] via-[#fff1d9] to-[#ffe5ec]",
};

export function LandingDecor({
  variant = "lavender",
  className,
}: LandingDecorProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      aria-hidden="true"
    >
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-90",
          variantGlows[variant],
        )}
      />
      <div className="absolute -left-24 top-14 size-72 rounded-full bg-[#c7b7ff]/30 blur-3xl" />
      <div className="absolute -right-28 top-1/4 size-80 rounded-full bg-[#ffd6a8]/35 blur-3xl" />
      <div className="absolute -bottom-32 left-1/3 size-96 rounded-full bg-[#fff0a6]/35 blur-3xl" />

      <Icons.star className="animate-floaty text-primary/20 absolute left-[8%] top-24 size-6 rotate-12" />
      <Icons.sparkles className="animate-floaty-slow absolute right-[12%] top-20 size-8 -rotate-12 text-[#f0a64a]/30" />
      <Icons.cloud className="animate-floaty-slow absolute left-[6%] top-[48%] hidden size-16 text-white/70 drop-shadow-sm sm:block" />
      <Icons.cloud className="animate-floaty absolute bottom-[18%] right-[7%] size-14 text-white/75 drop-shadow-sm" />
      <Icons.pencil className="animate-floaty-slow text-primary/20 absolute bottom-20 left-[13%] hidden size-9 -rotate-45 md:block" />

      <svg
        className="text-primary/20 absolute left-[12%] top-[34%] hidden h-44 w-80 md:block"
        viewBox="0 0 340 180"
        fill="none"
      >
        <path
          d="M7 155C67 54 139 196 205 84C242 21 286 24 329 51"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="8 12"
        />
      </svg>

      <div className="border-primary/10 absolute right-[18%] top-[13%] hidden h-24 w-20 rotate-6 rounded-2xl border-2 bg-white/45 shadow-sm md:block" />
      <Image
        src="/illustrations/lineart-sample.svg"
        alt=""
        width={120}
        height={120}
        className="animate-floaty absolute bottom-12 right-[16%] hidden opacity-20 lg:block"
      />
    </div>
  );
}
