import { SidebarNavItem } from "types";

export const sidebarLinks: SidebarNavItem[] = [
  {
    title: "CREATE",
    items: [
      { href: "/dashboard", icon: "dashboard", title: "Dashboard" },
      { href: "/upload", icon: "media", title: "Upload Photo" },
      { href: "/ai-generator", icon: "messages", title: "AI Generator" },
      { href: "/creations", icon: "bookOpen", title: "My Creations" },
      { href: "/dashboard/coloring", icon: "palette", title: "Color Online" },
      {
        href: "/dashboard/book-editor",
        icon: "bookOpen",
        title: "Book Editor",
      },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      { href: "/dashboard/billing", icon: "billing", title: "Billing" },
      { href: "/dashboard/settings", icon: "settings", title: "Settings" },
    ],
  },
  {
    title: "HELP",
    items: [
      { href: "/", icon: "home", title: "Homepage" },
      { href: "/help", icon: "help", title: "Help & FAQ" },
    ],
  },
];
