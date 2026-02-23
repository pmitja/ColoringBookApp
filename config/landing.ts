import { FeatureLdg, InfoLdg, TestimonialType } from "types";

export const infos: InfoLdg[] = [
  {
    title: "Powerful Book Editor & PDF Builder",
    description:
      "Visually arrange your generated pages, add custom titles, and compile your own coloring book. Ready to download as a print-ready PDF in seconds.",
    image: "/illustrations/landing-book.svg",
    list: [
      {
        title: "Drag-and-drop builder",
        description:
          "Easily organize your pages into a cohesive book.",
        icon: "laptop",
      },
      {
        title: "Custom Covers",
        description: "Generate striking front and back covers.",
        icon: "bookOpen",
      },
      {
        title: "Print-ready exports",
        description: "Get crisp PDFs for any home or professional printer.",
        icon: "download",
      },
    ],
  },
  {
    title: "Color Online Instantly",
    description:
      "Don't want to print? Color your generated pages right in your browser. Our intuitive digital coloring tool is perfect for quick fun on any device.",
    image: "/illustrations/hero-coloring.svg",
    list: [
      {
        title: "Digital Color Palette",
        description: "Vibrant colors that stay perfectly inside the lines.",
        icon: "palette",
      },
      {
        title: "Works everywhere",
        description: "Enjoy coloring on desktop, tablet, or mobile.",
        icon: "laptop",
      },
      {
        title: "Save & Share",
        description: "Save your masterpiece to your account or share it.",
        icon: "copy",
      },
    ],
  },
];

export const features: FeatureLdg[] = [
  {
    title: "Image to Lineart",
    description:
      "Turn any photo into crisp line art perfect for coloring.",
    link: "/",
    icon: "media",
  },
  {
    title: "Text to Page",
    description:
      "Type a prompt and let AI generate a unique coloring page.",
    link: "/",
    icon: "post",
  },
  {
    title: "Whole Book Generation",
    description:
      "Create a full book with covers and pages from a single prompt.",
    link: "/",
    icon: "bookOpen",
  },
  {
    title: "Consistent Avatars",
    description:
      "Use an uploaded face to generate consistent characters.",
    link: "/",
    icon: "user",
  },
  {
    title: "Online Coloring",
    description:
      "Color your creations digitally right in your browser.",
    link: "/",
    icon: "palette",
  },
  {
    title: "Print-Ready PDFs",
    description:
      "Export your creations in high-quality PDF format.",
    link: "/",
    icon: "download",
  },
];

export const testimonials: TestimonialType[] = [
  {
    name: "Sarah L.",
    job: "Parent",
    image: "/avatars/avatar-01.svg",
    review:
      "The whole book generation is pure magic. I typed in 'dragons in space' and we had a 10-page book to color instantly!",
  },
  {
    name: "Mark T.",
    job: "Teacher",
    image: "/avatars/avatar-02.svg",
    review:
      "Turning class photos into lineart was a huge hit with the kids. The privacy guarantee gives me great peace of mind.",
  },
  {
    name: "Elena G.",
    job: "Digital Artist",
    image: "/avatars/avatar-03.svg",
    review:
      "The consistent avatar feature is incredible. I can create ongoing coloring adventures starring my niece!",
  },
];
