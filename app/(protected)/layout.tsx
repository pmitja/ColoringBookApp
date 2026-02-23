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
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.08),_transparent_58%)]" />

      <DashboardSidebar links={filteredLinks} />

      <div className="relative flex flex-1 flex-col">
        <header className="border-border/70 bg-background/95 sticky top-0 z-50 flex h-14 border-b px-4 backdrop-blur lg:h-[60px] xl:px-8">
          <MaxWidthWrapper className="flex max-w-7xl items-center gap-x-3 px-0">
            <MobileSheetSidebar links={filteredLinks} />
            <div className="flex-1" />
            <ModeToggle />
            <UserAccountNav />
          </MaxWidthWrapper>
        </header>

        <main id="main-content" className="flex-1 p-4 xl:px-8">
          <MaxWidthWrapper className="flex h-full max-w-full flex-col gap-6 px-0 pb-8">
            {children}
          </MaxWidthWrapper>
        </main>
      </div>
    </div>
  );
}
