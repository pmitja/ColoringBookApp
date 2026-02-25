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
        "relative overflow-hidden border-t-4 border-slate-900 bg-[#bde2f1] pt-32 dark:border-slate-700 dark:bg-slate-900",
        className,
      )}
    >
      {/* Decorative landscape background layer */}
      <div className="pointer-events-none absolute left-0 top-0 z-0 h-[150px] w-full overflow-hidden">
         {/* Cloud separator at the top */}
        <svg
          className="relative block h-[80px] w-full"
          data-name="Layer 1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
            className="fill-slate-50 dark:fill-slate-800"
          ></path>
          <path
            d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-50.24V0Z"
            className="fill-slate-50 dark:fill-slate-800"
          ></path>
        </svg>
      </div>

      <div className="container relative z-10 mx-auto max-w-6xl px-4 pb-12">
        <div className="grid gap-12 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-2">
            <Link href="/" className="inline-block rounded-full border-2 border-slate-900 bg-white p-2 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:border-slate-600 dark:bg-slate-800 dark:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]">
               <Icons.logo className="h-10 w-auto" />
            </Link>
            <p className="max-w-sm text-base font-medium leading-relaxed text-slate-800 dark:text-slate-300">
              Create printable coloring books from your own photos in minutes.
              Designed for families, teachers, and creators to unleash their imagination.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href={siteConfig.links.github}
                target="_blank"
                rel="noreferrer"
                className="flex size-10 items-center justify-center rounded-full border-2 border-slate-900 bg-white text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-transform hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] dark:hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]"
                aria-label="Open GitHub"
              >
                <Icons.gitHub className="size-5" />
              </Link>
              <Link
                href={siteConfig.links.twitter}
                target="_blank"
                rel="noreferrer"
                className="flex size-10 items-center justify-center rounded-full border-2 border-slate-900 bg-white text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-transform hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] dark:hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]"
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
                <h3 className="font-heading text-xl font-extrabold text-slate-900 dark:text-slate-100">
                  {section.title}
                </h3>
                <ul className="space-y-3">
                  {section.items?.map((link) => (
                    <li key={link.title}>
                      <Link
                        href={link.href}
                        className="text-sm font-bold text-slate-700 transition-colors hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-slate-400 dark:hover:text-slate-200"
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

        <div className="mt-12 flex flex-col items-center justify-between gap-6 rounded-[2rem] border-4 border-slate-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] sm:flex-row dark:border-slate-700 dark:bg-slate-800 dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] lg:mt-16 lg:p-8">
           <div className="flex flex-col gap-2">
              <h4 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-slate-100">Join our creative newsletter</h4>
              <p className="text-base font-medium text-slate-600 dark:text-slate-400">Get tips, free prompts, and new features.</p>
           </div>
           <div className="w-full sm:max-w-sm">
             <NewsletterForm />
           </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t-2 border-slate-900/20 pt-8 text-center dark:border-slate-700/50 sm:flex-row sm:text-left">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-400">
            © {new Date().getFullYear()} Colorline AI. Built by{" "}
            <Link
              href={siteConfig.links.twitter}
              target="_blank"
              rel="noreferrer"
              className="text-slate-900 hover:underline dark:text-slate-200"
            >
              mickasmt
            </Link>
            .
          </p>
          <div className="flex items-center gap-4 text-sm font-bold text-slate-700 dark:text-slate-400">
             <Link href="/terms" className="hover:text-slate-900 hover:underline dark:hover:text-slate-200">Terms</Link>
             <Link href="/privacy" className="hover:text-slate-900 hover:underline dark:hover:text-slate-200">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

