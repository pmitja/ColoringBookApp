export const INTO_LINEART =
  "Convert this image into clean black-and-white coloring-book line art. Preserve identities, pose, and composition. Use crisp outlines with open white spaces for coloring. Background and empty regions must be pure white with zero gray tint. No grayscale shading, hatching, crosshatching, texture fills, text, logos, page borders, frames, or watermarks.";

export const BASE_STYLES = {
  DEFAULT:
    "Create a clean, friendly coloring-book illustration with readable outlines, balanced detail, and strong subject clarity. Preserve identity, pose, and composition while keeping shapes simple enough for easy coloring.",
  CARTOON:
    "Create a playful cartoon look with rounded forms, bouncy proportions, expressive faces, and bold silhouette readability. Keep scene composition intact while simplifying clutter for coloring-page conversion.",
  ANIME:
    "Create an anime-inspired illustration with clean line direction, expressive eyes, cel-shading intent, and polished character appeal. Preserve face identity and pose while keeping edges crisp for line-art extraction.",
  LEGO: "Create a toy-brick inspired scene with minifigure-like proportions, blocky geometry, stud-friendly surfaces, and playful plastic construction cues. Preserve scene layout and character intent with simple, readable forms.",
  INTRICATE:
    "Create highly detailed ornamental line guidance with layered decorative motifs, floral curves, and dense but organized pattern work. Preserve the core subject while enriching background and costume detail for advanced coloring.",
  MINIMALIST:
    "Create a minimal composition with generous negative space, simplified shapes, clean contour hierarchy, and reduced visual noise. Preserve key subject and action while removing non-essential detail.",
  GEOMETRIC:
    "Create a geometric interpretation using symmetry, angular contours, repeating primitives, and structured spatial rhythm. Preserve the main scene concept while translating forms into clear geometric shape language.",
  SCIFI:
    "Create a sci-fi concept look with futuristic silhouettes, tech motifs, clean mechanical forms, and cinematic depth cues. Preserve composition and character identity while emphasizing imaginative futuristic detail.",
  KAWAII:
    "Create a kawaii style with extra-cute rounded forms, gentle expressions, soft proportions, and cozy playful charm. Preserve scene intent while enhancing cuteness and clarity for younger coloring audiences.",
  CHIBI:
    "Create a chibi character style with oversized heads, tiny bodies, expressive faces, and adorable stylization. Preserve recognizable identity and scene context while maximizing cute, readable line shapes.",
} as const;

export type StyleId = keyof typeof BASE_STYLES;

export const STYLE_PRESETS: Record<
  StyleId,
  {
    label: string;
    subtitle: string;
    helper: string;
    previewImage: string;
    requiresAccount?: boolean;
  }
> = {
  DEFAULT: {
    label: "Default",
    subtitle: "Balanced and clean",
    helper: "Good baseline for most scenes",
    previewImage: "/illustrations/styles/basic-style.webp",
  },
  CARTOON: {
    label: "Cartoon",
    subtitle: "Playful and bold",
    helper: "Great for kids and mascots",
    previewImage: "/illustrations/styles/cartoon-style.webp",
  },
  ANIME: {
    label: "Anime",
    subtitle: "Expressive character look",
    helper: "Stylized face and line flow",
    previewImage: "/illustrations/styles/anime-style.webp",
  },
  LEGO: {
    label: "Lego",
    subtitle: "Blocky toy world",
    helper: "Brick-like forms and figures",
    previewImage: "/illustrations/styles/lego.svg",
  },
  INTRICATE: {
    label: "Intricate",
    subtitle: "Detailed patterning",
    helper: "Dense decorative complexity",
    previewImage: "/illustrations/styles/intricate-style.webp",
  },
  MINIMALIST: {
    label: "Minimalist",
    subtitle: "Simple open compositions",
    helper: "Less clutter, more white space",
    previewImage: "/illustrations/styles/minimalist-style.webp",
  },
  GEOMETRIC: {
    label: "Geometric",
    subtitle: "Structured shapes",
    helper: "Symmetry and clean geometry",
    previewImage: "/illustrations/styles/geometric.svg",
  },
  SCIFI: {
    label: "Sci-Fi",
    subtitle: "Futuristic scenes",
    helper: "Tech motifs and depth cues",
    previewImage: "/illustrations/styles/sci-fi-style.webp",
  },
  KAWAII: {
    label: "Kawaii",
    subtitle: "Soft and extra cute",
    helper: "Rounded friendly charm",
    previewImage: "/illustrations/styles/kawaii.svg",
  },
  CHIBI: {
    label: "Chibi",
    subtitle: "Tiny body, big head",
    helper: "Adorable mini proportions",
    previewImage: "/illustrations/styles/chibi.svg",
  },
};
