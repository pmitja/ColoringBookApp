import { redirect } from "next/navigation";

import { sidebarLinks } from "@/config/dashboard";
import { getCurrentUser } from "@/lib/session";
import {
  DashboardSidebar,
  MobileSheetSidebar,
} from "@/components/layout/dashboard-sidebar";
import { ModeToggle } from "@/components/layout/mode-toggle";
import { UserAccountNav } from "@/components/layout/user-account-nav";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export default async function Dashboard({ children }: ProtectedLayoutProps) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  const filteredLinks = sidebarLinks.map((section) => ({
    ...section,
    items: section.items.filter(
      ({ authorizeOnly }) => !authorizeOnly || authorizeOnly === user.role,
    ),
  }));

  return (
    <div className="dashboard-theme relative flex min-h-screen w-full overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,164,0.18),_transparent_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.18),_transparent_55%)]" />
        <div className="absolute right-[-120px] top-[-160px] h-[420px] w-[420px] rounded-full bg-[rgba(245,158,11,0.12)] blur-3xl dark:bg-[rgba(245,158,11,0.18)]" />
        <div className="absolute bottom-[-200px] left-[-140px] h-[480px] w-[480px] rounded-full bg-[rgba(59,130,246,0.12)] blur-3xl dark:bg-[rgba(59,130,246,0.18)]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,_rgba(255,255,255,0.92),_rgba(255,255,255,0.72))] dark:bg-[linear-gradient(120deg,_rgba(15,23,42,0.85),_rgba(15,23,42,0.65))]" />
      </div>

      <DashboardSidebar links={filteredLinks} />

      <div className="relative flex flex-1 flex-col">
        <header className="sticky top-0 z-50 flex h-14 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70 lg:h-[60px] xl:px-8">
          <MaxWidthWrapper className="flex max-w-7xl items-center gap-x-3 px-0">
            <MobileSheetSidebar links={filteredLinks} />
            <div className="flex-1" />

            <ModeToggle />
            <UserAccountNav />
          </MaxWidthWrapper>
        </header>

        <main className="flex-1 p-4 xl:px-8">
          <MaxWidthWrapper className="flex h-full max-w-full flex-col gap-6 px-0">
            {children}
          </MaxWidthWrapper>
        </main>
      </div>
    </div>
  );
}
