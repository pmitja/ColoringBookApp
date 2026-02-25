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
    <div className="relative flex h-screen w-full overflow-hidden bg-[#f8fbff] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Whimsical Background Elements for Dashboard */}
      <div className="pointer-events-none fixed left-0 top-0 z-0 size-full overflow-hidden">
        <div className="absolute left-[10%] top-10 size-64 rounded-full bg-yellow-100 opacity-40 blur-3xl dark:bg-yellow-900/20" />
        <div className="absolute bottom-20 right-[5%] size-96 rounded-full bg-blue-100 opacity-40 blur-3xl dark:bg-blue-900/20" />
        <div className="absolute right-[15%] top-1/3 size-40 rounded-full bg-pink-100 opacity-40 blur-3xl dark:bg-pink-900/20" />
      </div>

      <DashboardSidebar links={filteredLinks} />

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <header className="sticky top-0 z-50 flex h-20 shrink-0 items-center border-b-4 border-slate-900 bg-white/80 px-4 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/80 xl:px-8">
          <MaxWidthWrapper className="flex w-full max-w-7xl items-center gap-x-3 px-0">
            <MobileSheetSidebar links={filteredLinks} />
            <div className="flex-1" />
            <div className="flex items-center gap-4">
              <ModeToggle />
              <UserAccountNav />
            </div>
          </MaxWidthWrapper>
        </header>

        <main id="main-content" className="flex-1 p-4 xl:p-8">
          <MaxWidthWrapper className="flex h-full max-w-full flex-col gap-8 px-0 pb-12">
            {children}
          </MaxWidthWrapper>
        </main>
      </div>
    </div>
  );
}
