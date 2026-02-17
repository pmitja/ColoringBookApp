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

interface NavBarProps {
  scroll?: boolean;
  large?: boolean;
}

export function NavBar({ scroll = false }: NavBarProps) {
  const scrolled = useScroll(50);
  const { data: session, status } = useSession();
  const { setShowSignInModal } = useContext(ModalContext);

  const selectedLayout = useSelectedLayoutSegment();
  const links = marketingConfig.mainNav;

  return (
    <header
      className={`sticky top-0 z-40 flex w-full justify-center backdrop-blur-xl transition-all ${
        scroll
          ? scrolled
            ? "border-border/70 bg-background/85 border-b"
            : "bg-transparent"
          : "border-border/70 bg-background/85 border-b"
      }`}
    >
      <MaxWidthWrapper
        className="flex h-16 items-center justify-between py-4"
        large={false}
      >
        <div className="flex gap-6 md:gap-10">
          <Link
            href="/"
            className="flex items-center rounded-full bg-white/70 px-3.5 py-2 dark:bg-white/10"
          >
            <Icons.logo className="h-9 w-auto" />
          </Link>

          {links && links.length > 0 ? (
            <nav className="hidden gap-2 md:flex">
              {links.map((item, index) => (
                <Link
                  key={index}
                  href={item.disabled ? "#" : item.href}
                  prefetch={true}
                  className={cn(
                    "flex items-center rounded-full px-4 text-sm font-semibold transition-colors",
                    item.href.startsWith(`/${selectedLayout}`)
                      ? "bg-secondary/80 text-foreground"
                      : "text-foreground/70 hover:bg-white/70 hover:text-foreground dark:hover:bg-white/10",
                    item.disabled && "cursor-not-allowed opacity-80",
                  )}
                >
                  {item.title}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>

        <div className="flex items-center space-x-3">
          {session ? (
            <Link
              href={session.user.role === "ADMIN" ? "/admin" : "/dashboard"}
              className="hidden md:block"
            >
              <Button
                className="shadow-primary/30 gap-2 px-5 shadow-sm"
                variant="default"
                size="sm"
                rounded="full"
              >
                <span>Dashboard</span>
              </Button>
            </Link>
          ) : status === "unauthenticated" ? (
            <Button
              className="shadow-primary/30 hidden gap-2 px-5 shadow-sm md:flex"
              variant="default"
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
      </MaxWidthWrapper>
    </header>
  );
}
