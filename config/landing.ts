import { FeatureLdg, InfoLdg, TestimonialType } from "types";

export const infos: InfoLdg[] = [
  {
    title: "From Photo to Printable Line Art",
    description:
      "Upload a family photo, pick a style, and get crisp line art that is ready for crayons, markers, or colored pencils.",
    image: "/illustrations/landing-story.svg",
    list: [
      {
        title: "Original upload not saved",
        description:
          "We process your photo to create line art, but we do not save the original uploaded image.",
        icon: "settings",
      },
      {
        title: "Kid-friendly lines",
        description: "Clean outlines that are easy for little hands to color.",
        icon: "bookOpen",
      },
      {
        title: "Fast turnaround",
        description: "Pages are ready in minutes, not hours.",
        icon: "lineChart",
      },
    ],
  },
  {
    title: "Make a Whole Book Together",
    description:
      "Collect multiple pages, add titles, and export a full coloring book for family nights or classrooms.",
    image: "/illustrations/landing-book.svg",
    list: [
      {
        title: "Multi-page books",
        description: "Combine favorite photos into a complete book.",
        icon: "copy",
      },
      {
        title: "Print-ready exports",
        description: "Get crisp PDFs and PNGs for any printer.",
        icon: "download",
      },
      {
        title: "Works everywhere",
        description: "Create on desktop, tablet, or mobile.",
        icon: "laptop",
      },
    ],
  },
];

export const features: FeatureLdg[] = [
  {
    title: "Original upload not saved",
    description:
      "We process your photo to create line art, but we do not save the original uploaded image.",
    link: "/",
    icon: "settings",
  },
  {
    title: "Print-ready downloads",
    description:
      "Export crisp PDFs and PNGs that look great on any home printer.",
    link: "/",
    icon: "download",
  },
  {
    title: "Kid-friendly editor",
    description:
      "Drag, resize, and arrange pages with big, clear controls.",
    link: "/",
    icon: "bookOpen",
  },
  {
    title: "Fast creation",
    description:
      "Most photos become line art in minutes, not hours.",
    link: "/",
    icon: "lineChart",
  },
  {
    title: "Multi-page books",
    description:
      "Build a full book with titles, covers, and multiple pages.",
    link: "/",
    icon: "copy",
  },
  {
    title: "Works on any device",
    description:
      "Create on laptop, tablet, or phone without losing progress.",
    link: "/",
    icon: "laptop",
  },
];

export const testimonials: TestimonialType[] = [
  {
    name: "Maya R.",
    job: "Parent of Two",
    image: "/avatars/avatar-01.svg",
    review:
      "My kids color the pages every weekend. The lines are clean and the prints look amazing on our home printer.",
  },
  {
    name: "Chris T.",
    job: "Kindergarten Teacher",
    image: "/avatars/avatar-02.svg",
    review:
      "I made a class coloring book from our field trip photos. The kids were thrilled and it printed perfectly.",
  },
  {
    name: "Priya S.",
    job: "Busy Mom",
    image: "/avatars/avatar-03.svg",
    review:
      "The editor is simple enough for my 5-year-old, and I still get professional-looking pages.",
  },
];
