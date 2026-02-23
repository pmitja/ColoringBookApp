"use client";

import { useContext } from "react";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { useSession } from "next-auth/react";

import { marketingConfig } from "@/config/marketing";
import { cn } from "@/lib/utils";
import { useScroll } from "@/hooks/use-scroll";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ModalContext } from "@/components/modals/providers";
import { Icons } from "@/components/shared/icons";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

import { ModeToggle } from "./mode-toggle";

interface NavBarProps {
  scroll?: boolean;
  large?: boolean;
}

export function NavBar({ scroll = false }: NavBarProps) {
  const scrolled = useScroll(40);
  const { data: session, status } = useSession();
  const { setShowSignInModal } = useContext(ModalContext);

  const selectedLayout = useSelectedLayoutSegment();
  const links = marketingConfig.mainNav;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex w-full justify-center px-3 pt-3 transition-[transform,background-color,border-color,box-shadow] duration-300",
        scroll && !scrolled && "md:pt-4",
      )}
    >
      <MaxWidthWrapper className="max-w-7xl px-0">
        <div
          className={cn(
            "surface-glass flex h-16 items-center justify-between rounded-2xl px-3 sm:px-4",
            scroll
              ? scrolled
                ? "border-border/90 bg-background/88"
                : "border-border/70 bg-background/72"
              : "border-border/90 bg-background/88",
          )}
        >
          <div className="flex items-center gap-2 md:gap-3">
            <Link
              href="/"
              className="border-border/70 flex items-center rounded-xl border bg-white/70 px-3 py-2 shadow-sm transition-colors hover:bg-white/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:bg-white/10 dark:hover:bg-white/15"
            >
              <Icons.logo className="h-8 w-auto sm:h-9" />
            </Link>

            {links && links.length > 0 ? (
              <nav
                className="hidden items-center gap-1 md:flex"
                aria-label="Main"
              >
                {links.map((item, index) => {
                  const isActive = item.href.startsWith(`/${selectedLayout}`);

                  return (
                    <Link
                      key={index}
                      href={item.disabled ? "#" : item.href}
                      prefetch={true}
                      className={cn(
                        "rounded-xl px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        isActive
                          ? "bg-secondary text-secondary-foreground"
                          : "text-foreground/75 hover:bg-secondary/70 hover:text-foreground",
                        item.disabled && "cursor-not-allowed opacity-70",
                      )}
                    >
                      {item.title}
                    </Link>
                  );
                })}
              </nav>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <ModeToggle />
            </div>

            {session ? (
              <Link
                href={session.user.role === "ADMIN" ? "/admin" : "/dashboard"}
                className="hidden md:block"
              >
                <Button
                  className="gap-2 px-4 shadow-sm"
                  size="sm"
                  rounded="full"
                >
                  <span>Dashboard</span>
                </Button>
              </Link>
            ) : status === "unauthenticated" ? (
              <Button
                className="hidden gap-2 px-4 shadow-sm md:flex"
                size="sm"
                rounded="full"
                onClick={() => setShowSignInModal(true)}
              >
                <span>Sign In</span>
                <Icons.arrowRight className="size-4" />
              </Button>
            ) : (
              <Skeleton className="hidden h-9 w-28 rounded-full lg:flex" />
            )}
          </div>
        </div>
      </MaxWidthWrapper>
    </header>
  );
}
