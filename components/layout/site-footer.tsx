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
        "bg-muted/30 relative overflow-hidden border-t border-border pt-16",
        className,
      )}
    >
      <div className="from-primary/10 absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] via-background to-background" />

      <div className="container relative z-10 mx-auto max-w-6xl px-4 pb-12">
        <div className="grid gap-12 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-2">
            <Link href="/" className="inline-block rounded-full bg-white/80 p-2 shadow-sm dark:bg-white/10">
               <Icons.logo className="h-10 w-auto" />
            </Link>
            <p className="max-w-sm text-base leading-relaxed text-muted-foreground">
              Create printable coloring books from your own photos in minutes.
              Designed for families, teachers, and creators to unleash their imagination.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href={siteConfig.links.github}
                target="_blank"
                rel="noreferrer"
                className="flex size-10 items-center justify-center rounded-full border bg-background shadow-sm transition-transform hover:scale-110 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Open GitHub"
              >
                <Icons.gitHub className="size-5" />
              </Link>
              <Link
                href={siteConfig.links.twitter}
                target="_blank"
                rel="noreferrer"
                className="flex size-10 items-center justify-center rounded-full border bg-background shadow-sm transition-transform hover:scale-110 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Open Twitter"
              >
                <Icons.twitter className="size-4" />
              </Link>
              <div className="ml-2">
                 <ModeToggle />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-3">
            {footerLinks.map((section) => (
              <div key={section.title} className="space-y-4">
                <h3 className="font-heading text-lg font-bold text-foreground">
                  {section.title}
                </h3>
                <ul className="space-y-3">
                  {section.items?.map((link) => (
                    <li key={link.title}>
                      <Link
                        href={link.href}
                        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {link.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-background/50 mt-12 flex flex-col items-center justify-between gap-6 rounded-3xl border p-6 backdrop-blur-sm sm:flex-row lg:mt-16 lg:p-8">
           <div className="flex flex-col gap-2">
              <h4 className="font-heading text-lg font-bold">Join our creative newsletter</h4>
              <p className="text-sm text-muted-foreground">Get tips, free prompts, and new features.</p>
           </div>
           <div className="w-full sm:max-w-sm">
             <NewsletterForm />
           </div>
        </div>

        <div className="border-border/50 mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 text-center sm:flex-row sm:text-left">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Colorline AI. Built by{" "}
            <Link
              href={siteConfig.links.twitter}
              target="_blank"
              rel="noreferrer"
              className="font-bold text-foreground transition-colors hover:text-primary"
            >
              mickasmt
            </Link>
            .
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
             <Link href="/terms" className="transition-colors hover:text-primary">Terms</Link>
             <Link href="/privacy" className="transition-colors hover:text-primary">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

