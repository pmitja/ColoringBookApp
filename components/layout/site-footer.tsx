import * as React from "react";
import Link from "next/link";

import { footerLinks, siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/layout/mode-toggle";

import { NewsletterForm } from "../forms/newsletter-form";
import { Icons } from "../shared/icons";

export function SiteFooter({ className }: React.HTMLAttributes<HTMLElement>) {
  return (
    <footer
      className={cn(
        "border-border/80 bg-background/60 mt-16 border-t",
        className,
      )}
    >
      <div className="container max-w-6xl py-12">
        <div className="surface-glass grid gap-8 rounded-3xl p-6 md:grid-cols-5 md:p-8">
          <div className="space-y-3 md:col-span-2">
            <Icons.logo className="h-9 w-auto" />
            <p className="max-w-sm text-sm text-muted-foreground">
              Create printable coloring books from your own photos in minutes.
              Designed for families, teachers, and creators.
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={siteConfig.links.github}
                target="_blank"
                rel="noreferrer"
                className="border-border/80 rounded-full border p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label="Open GitHub"
              >
                <Icons.gitHub className="size-4" />
              </Link>
              <ModeToggle />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:col-span-3">
            {footerLinks.map((section) => (
              <div key={section.title}>
                <h2 className="font-heading text-base text-foreground">
                  {section.title}
                </h2>
                <ul className="mt-3 space-y-2">
                  {section.items?.map((link) => (
                    <li key={link.title}>
                      <Link
                        href={link.href}
                        className="rounded-md text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        {link.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="md:col-span-5">
            <div className="border-border/70 bg-card/70 rounded-2xl border p-4">
              <NewsletterForm />
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>
            Built by{" "}
            <Link
              href={siteConfig.links.twitter}
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              mickasmt
            </Link>
            . Hosted on{" "}
            <Link
              href="https://vercel.com"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              Vercel
            </Link>
            . Illustrations by{" "}
            <Link
              href="https://popsy.co"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              Popsy
            </Link>
            .
          </p>
          <p className="text-xs md:text-sm">Colorline AI</p>
        </div>
      </div>
    </footer>
  );
}
