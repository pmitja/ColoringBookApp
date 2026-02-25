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
    <div className="relative flex h-screen w-full overflow-hidden bg-[#f8fbff] dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      {/* Whimsical Background Elements for Dashboard */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-10 left-[10%] w-64 h-64 bg-yellow-100 dark:bg-yellow-900/20 rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-20 right-[5%] w-96 h-96 bg-blue-100 dark:bg-blue-900/20 rounded-full blur-3xl opacity-40" />
        <div className="absolute top-1/3 right-[15%] w-40 h-40 bg-pink-100 dark:bg-pink-900/20 rounded-full blur-3xl opacity-40" />
      </div>

      <DashboardSidebar links={filteredLinks} />

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <header className="sticky top-0 z-50 flex h-20 shrink-0 items-center px-4 xl:px-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b-4 border-slate-900 dark:border-slate-700 shadow-sm">
          <MaxWidthWrapper className="flex max-w-7xl items-center gap-x-3 px-0 w-full">
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
