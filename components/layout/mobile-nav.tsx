"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useSession } from "next-auth/react";

import { marketingConfig } from "@/config/marketing";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/shared/icons";

import { ModeToggle } from "./mode-toggle";

export function NavMobile() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const links = marketingConfig.mainNav;

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "auto";

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        aria-controls="mobile-nav"
        className={cn(
          "border-border/80 bg-background/88 hover:bg-secondary/90 active:bg-secondary/95 fixed right-3 top-3 z-50 rounded-full border p-2.5 shadow-sm backdrop-blur focus-visible:ring-ring focus-visible:ring-offset-background md:hidden",
          "transition-[background-color,box-shadow,border-color] duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        )}
      >
        {open ? (
          <X className="size-5 text-muted-foreground" />
        ) : (
          <Menu className="size-5 text-muted-foreground" />
        )}
      </button>

      <nav
        id="mobile-nav"
        aria-label="Mobile"
        className={cn(
          "bg-background/95 fixed inset-0 z-20 hidden w-full overflow-auto px-5 pb-8 pt-20 backdrop-blur-xl lg:hidden",
          open && "animate-rise block",
        )}
      >
        <div className="surface-glass rounded-3xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="rounded-lg"
            >
              <Icons.logo className="h-8 w-auto" />
              <span className="sr-only">Colorline AI</span>
            </Link>
            <ModeToggle />
          </div>

          <ul className="divide-border/60 grid divide-y" role="list">
            {links?.map(({ title, href }) => (
              <li key={href} className="py-1.5">
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className="hover:bg-secondary/70 flex w-full rounded-xl px-4 py-2.5 font-semibold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {title}
                </Link>
              </li>
            ))}

            {session ? (
              <>
                {session.user.role === "ADMIN" ? (
                  <li className="py-1.5">
                    <Link
                      href="/admin"
                      onClick={() => setOpen(false)}
                      className="hover:bg-secondary/70 flex w-full rounded-xl px-4 py-2.5 font-semibold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      Admin
                    </Link>
                  </li>
                ) : null}

                <li className="py-1.5">
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="hover:bg-secondary/70 flex w-full rounded-xl px-4 py-2.5 font-semibold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    Dashboard
                  </Link>
                </li>
              </>
            ) : (
              <>
                <li className="py-1.5">
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="hover:bg-secondary/70 flex w-full rounded-xl px-4 py-2.5 font-semibold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    Login
                  </Link>
                </li>

                <li className="py-1.5">
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className="hover:bg-primary/90 flex w-full rounded-xl bg-primary px-4 py-2.5 font-semibold capitalize text-primary-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    Sign Up
                  </Link>
                </li>
              </>
            )}
          </ul>

          <div className="mt-5 flex items-center justify-end">
            <Link
              href={siteConfig.links.github}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Icons.gitHub className="size-6" />
              <span className="sr-only">GitHub</span>
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
}
