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
    <div className="dashboard-theme relative flex min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(242,213,187,0.24),_transparent_52%)] dark:bg-[radial-gradient(circle_at_top,_rgba(214,181,166,0.2),_transparent_52%)]" />
        <div className="absolute right-[-120px] top-[-160px] size-[420px] rounded-full bg-[rgba(187,213,233,0.22)] blur-3xl dark:bg-[rgba(163,189,212,0.14)]" />
        <div className="absolute bottom-[-180px] left-[-140px] size-[460px] rounded-full bg-[rgba(232,203,215,0.2)] blur-3xl dark:bg-[rgba(205,176,190,0.12)]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,_rgba(251,248,242,0.95),_rgba(246,239,230,0.84))] dark:bg-[linear-gradient(120deg,_rgba(33,38,62,0.92),_rgba(37,44,71,0.82))]" />
      </div>

      <DashboardSidebar links={filteredLinks} />

      <div className="relative flex flex-1 flex-col">
        <header className="border-border/70 bg-background/80 sticky top-0 z-50 flex h-14 border-b px-4 backdrop-blur-xl lg:h-[60px] xl:px-8">
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
