"use client";

import { useContext } from "react";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";

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
        "sticky top-0 z-50 -mb-20 flex w-full justify-center px-4 pt-4 transition-all duration-500 md:-mb-24",
        scroll && scrolled ? "pt-2" : "md:pt-6",
      )}
    >
      <MaxWidthWrapper className="max-w-6xl px-0">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn(
            "flex h-16 items-center justify-between rounded-full border px-4 shadow-sm transition-all duration-500 sm:px-6",
            scrolled
              ? "bg-background/80 border-border shadow-md backdrop-blur-xl"
              : "bg-background/40 border-border/50 backdrop-blur-md",
          )}
        >
          <div className="flex items-center gap-4 md:gap-6">
            <Link
              href="/"
              className="flex items-center rounded-full bg-white/90 px-3 py-1.5 shadow-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-white/10"
            >
              <Icons.logo className="h-7 w-auto sm:h-8" />
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
                        "relative rounded-full px-4 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isActive
                          ? "text-primary"
                          : "text-foreground/70 hover:bg-muted/50 hover:text-foreground",
                        item.disabled && "cursor-not-allowed opacity-70",
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="navbar-active"
                          className="bg-primary/10 absolute inset-0 rounded-full"
                          transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                        />
                      )}
                      <span className="relative z-10">{item.title}</span>
                    </Link>
                  );
                })}
              </nav>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <ModeToggle />
            </div>

            {session ? (
              <Link
                href={session.user.role === "ADMIN" ? "/admin" : "/dashboard"}
                className="hidden md:block"
              >
                <Button
                  className="hover:bg-primary/90 gap-2 bg-primary px-5 text-primary-foreground shadow-sm transition-transform hover:scale-105"
                  size="sm"
                  rounded="full"
                >
                  <span>Dashboard</span>
                </Button>
              </Link>
            ) : status === "unauthenticated" ? (
              <Button
                className="hover:bg-primary/90 hidden gap-2 bg-primary px-5 text-primary-foreground shadow-sm transition-transform hover:scale-105 md:flex"
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
        </motion.div>
      </MaxWidthWrapper>
    </header>
  );
}
