"use client";

import { Fragment, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarNavItem } from "@/types";
import { Menu, PanelLeftClose, PanelRightClose } from "lucide-react";

import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UpgradeCard } from "@/components/dashboard/upgrade-card";
import { Icons } from "@/components/shared/icons";

interface DashboardSidebarProps {
  links: SidebarNavItem[];
}

export function DashboardSidebar({ links }: DashboardSidebarProps) {
  const path = usePathname();

  // NOTE: Use this if you want save in local storage -- Credits: Hosna Qasmei
  //
  // const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
  //   if (typeof window !== "undefined") {
  //     const saved = window.localStorage.getItem("sidebarExpanded");
  //     return saved !== null ? JSON.parse(saved) : true;
  //   }
  //   return true;
  // });

  // useEffect(() => {
  //   if (typeof window !== "undefined") {
  //     window.localStorage.setItem(
  //       "sidebarExpanded",
  //       JSON.stringify(isSidebarExpanded),
  //     );
  //   }
  // }, [isSidebarExpanded]);

  const { isTablet } = useMediaQuery();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(!isTablet);

  const toggleSidebar = () => {
    setIsSidebarExpanded(!isSidebarExpanded);
  };

  useEffect(() => {
    setIsSidebarExpanded(!isTablet);
  }, [isTablet]);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="hidden h-screen shrink-0 md:flex">
        <ScrollArea className="h-full overflow-y-auto border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm">
          <aside
            className={cn(
              isSidebarExpanded ? "w-[220px] xl:w-[260px]" : "w-[68px]",
              "h-full",
            )}
          >
            <div className="flex h-full max-h-screen flex-1 flex-col gap-2">
              <div className="flex h-16 items-center gap-2 p-4 lg:h-[68px]">
                {isSidebarExpanded ? (
                  <Link
                    href="/"
                    className="flex items-center gap-2 rounded-xl p-2 transition-colors hover:bg-sidebar-accent"
                  >
                    <Icons.logo className="h-8 w-auto" />
                  </Link>
                ) : (
                  <Link
                    href="/"
                    className="flex items-center justify-center rounded-xl p-2 transition-colors hover:bg-sidebar-accent"
                  >
                    <Image
                      src="/_static/favicon-32.webp"
                      alt=""
                      width={32}
                      height={32}
                      className="size-8 object-contain"
                    />
                    <span className="sr-only">Color Genie home</span>
                  </Link>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto size-9 rounded-full hover:bg-sidebar-accent"
                  onClick={toggleSidebar}
                >
                  {isSidebarExpanded ? (
                    <PanelLeftClose size={16} />
                  ) : (
                    <PanelRightClose size={16} />
                  )}
                  <span className="sr-only">Toggle Sidebar</span>
                </Button>
              </div>
              <Separator className="bg-sidebar-border/80 mx-4" />

              <nav className="flex flex-1 flex-col gap-6 px-4 pt-4">
                {links.map((section) => (
                  <section key={section.title} className="flex flex-col gap-1">
                    {isSidebarExpanded ? (
                      <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {section.title}
                      </p>
                    ) : (
                      <div className="h-4" />
                    )}
                    {section.items.map((item) => {
                      const Icon = Icons[item.icon || "arrowRight"];
                      return (
                        item.href && (
                          <Fragment key={`link-fragment-${item.title}`}>
                            {isSidebarExpanded ? (
                              <Link
                                key={`link-${item.title}`}
                                href={item.disabled ? "#" : item.href}
                                className={cn(
                                  buttonVariants({ variant: "ghost" }),
                                  "w-full justify-start gap-3 rounded-xl border border-transparent px-3 py-2 text-sm font-semibold transition-colors duration-200",
                                  path === item.href
                                    ? "border-primary/15 bg-primary/10 text-primary shadow-sm"
                                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                  item.disabled &&
                                    "cursor-not-allowed opacity-80 hover:bg-transparent hover:text-muted-foreground",
                                )}
                              >
                                <Icon
                                  className={cn(
                                    "size-5",
                                    path === item.href
                                      ? "text-primary"
                                      : "text-muted-foreground",
                                  )}
                                />
                                <span>{item.title}</span>
                                {item.badge && (
                                  <Badge className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                    {item.badge}
                                  </Badge>
                                )}
                              </Link>
                            ) : (
                              <Tooltip key={`tooltip-${item.title}`}>
                                <TooltipTrigger asChild>
                                  <Link
                                    key={`link-tooltip-${item.title}`}
                                    href={item.disabled ? "#" : item.href}
                                    className={cn(
                                      buttonVariants({
                                        variant: "ghost",
                                        size: "icon",
                                      }),
                                      "w-full justify-center rounded-xl border transition-[background-color,color,border-color,box-shadow] duration-200",
                                      path === item.href
                                        ? "border-primary/15 bg-primary/10 text-primary shadow-sm"
                                        : "border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                      item.disabled &&
                                        "cursor-not-allowed opacity-80 hover:bg-transparent hover:text-muted-foreground",
                                    )}
                                  >
                                    <span className="flex size-full items-center justify-center">
                                      <Icon className="size-5" />
                                    </span>
                                  </Link>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                  {item.title}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </Fragment>
                        )
                      );
                    })}
                  </section>
                ))}
              </nav>

              <div className="mt-auto xl:p-4">
                {isSidebarExpanded ? <UpgradeCard /> : null}
              </div>
            </div>
          </aside>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}

export function MobileSheetSidebar({ links }: DashboardSidebarProps) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { isSm, isMobile } = useMediaQuery();

  if (isSm || isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="size-9 shrink-0 rounded-full md:hidden"
          >
            <Menu className="size-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="bg-sidebar/96 flex flex-col border-sidebar-border p-0 backdrop-blur-xl"
        >
          <ScrollArea className="h-full overflow-y-auto">
            <div className="flex h-screen flex-col">
              <nav className="flex flex-1 flex-col gap-y-8 p-6 text-lg font-medium">
                <Link
                  href="/"
                  className="flex items-center text-lg font-semibold"
                >
                  <Icons.logo className="h-9 w-auto" />
                  <span className="sr-only">Home</span>
                </Link>

                {links.map((section) => (
                  <section
                    key={section.title}
                    className="flex flex-col gap-0.5"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {section.title}
                    </p>

                    {section.items.map((item) => {
                      const Icon = Icons[item.icon || "arrowRight"];
                      return (
                        item.href && (
                          <Fragment key={`link-fragment-${item.title}`}>
                            <Link
                              key={`link-${item.title}`}
                              onClick={() => {
                                if (!item.disabled) setOpen(false);
                              }}
                              href={item.disabled ? "#" : item.href}
                              className={cn(
                                "flex items-center gap-3 rounded-xl border border-transparent p-2 text-sm font-semibold transition-colors",
                                path === item.href
                                  ? "border-primary/15 bg-primary/10 text-primary shadow-sm"
                                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                item.disabled &&
                                  "cursor-not-allowed opacity-80 hover:bg-transparent hover:text-muted-foreground",
                              )}
                            >
                              <Icon className="size-5" />
                              {item.title}
                              {item.badge && (
                                <Badge className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full">
                                  {item.badge}
                                </Badge>
                              )}
                            </Link>
                          </Fragment>
                        )
                      );
                    })}
                  </section>
                ))}

                <div className="mt-auto">
                  <UpgradeCard />
                </div>
              </nav>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="flex size-9 animate-pulse rounded-lg bg-muted md:hidden" />
  );
}
