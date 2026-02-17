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

  // prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        className={cn(
          "border-border/70 bg-background/90 hover:bg-secondary/80 active:bg-secondary/80 fixed right-3 top-3 z-50 rounded-full border p-2.5 transition-colors duration-200 focus:outline-none md:hidden",
          open && "hover:bg-muted active:bg-muted",
        )}
      >
        {open ? (
          <X className="size-5 text-muted-foreground" />
        ) : (
          <Menu className="size-5 text-muted-foreground" />
        )}
      </button>

      <nav
        className={cn(
          "bg-background fixed inset-0 z-20 hidden w-full overflow-auto px-5 py-16 lg:hidden",
          open && "block",
        )}
      >
        <ul className="divide-border/50 grid divide-y">
          {links &&
            links.length > 0 &&
            links.map(({ title, href }) => (
              <li key={href} className="py-3">
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className="hover:bg-secondary/70 flex w-full rounded-full px-4 py-2 font-semibold capitalize"
                >
                  {title}
                </Link>
              </li>
            ))}

          {session ? (
            <>
              {session.user.role === "ADMIN" ? (
                <li className="py-3">
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="hover:bg-secondary/70 flex w-full rounded-full px-4 py-2 font-semibold capitalize"
                  >
                    Admin
                  </Link>
                </li>
              ) : null}

              <li className="py-3">
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="hover:bg-secondary/70 flex w-full rounded-full px-4 py-2 font-semibold capitalize"
                >
                  Dashboard
                </Link>
              </li>
            </>
          ) : (
            <>
              <li className="py-3">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="hover:bg-secondary/70 flex w-full rounded-full px-4 py-2 font-semibold capitalize"
                >
                  Login
                </Link>
              </li>

              <li className="py-3">
                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  className="hover:bg-secondary/70 flex w-full rounded-full px-4 py-2 font-semibold capitalize"
                >
                  Sign up
                </Link>
              </li>
            </>
          )}
        </ul>

        <div className="mt-5 flex items-center justify-end space-x-4">
          <Link href={siteConfig.links.github} target="_blank" rel="noreferrer">
            <Icons.gitHub className="size-6" />
            <span className="sr-only">GitHub</span>
          </Link>
          <ModeToggle />
        </div>
      </nav>
    </>
  );
}
