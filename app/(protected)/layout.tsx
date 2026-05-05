import Image from "next/image";
import { redirect } from "next/navigation";

import { sidebarLinks } from "@/config/dashboard";
import { getCurrentUser } from "@/lib/session";
import {
  DashboardSidebar,
  MobileSheetSidebar,
} from "@/components/layout/dashboard-sidebar";
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
    <div className="dashboard-theme relative flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Soft decorative illustrations */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <Image
          src="/illustrations/color-sample.svg"
          alt=""
          width={140}
          height={140}
          className="animate-floaty-slow absolute right-8 top-32 opacity-20 dark:opacity-10"
        />
        <Image
          src="/illustrations/lineart-sample.svg"
          alt=""
          width={120}
          height={120}
          className="animate-floaty absolute bottom-16 left-12 opacity-15 dark:opacity-10"
        />
      </div>

      <DashboardSidebar links={filteredLinks} />

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <header className="bg-background/85 sticky top-0 z-50 flex h-16 shrink-0 items-center border-b border-border px-4 shadow-sm backdrop-blur-md xl:px-8">
          <MaxWidthWrapper className="flex w-full max-w-7xl items-center gap-x-3 px-0">
            <MobileSheetSidebar links={filteredLinks} />
            <div className="flex-1" />
            <div className="flex items-center gap-4">
              <UserAccountNav />
            </div>
          </MaxWidthWrapper>
        </header>

        <main id="main-content" className="bg-muted/35 flex-1 p-4 xl:p-8">
          <MaxWidthWrapper className="flex h-full max-w-full flex-col gap-8 px-0 pb-12">
            {children}
          </MaxWidthWrapper>
        </main>
      </div>
    </div>
  );
}
