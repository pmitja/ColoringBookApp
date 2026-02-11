export const INTO_LINEART =
  "Convert this image into clean black-and-white coloring-book line art. Preserve identities, pose, and composition. Use crisp outlines with open white spaces for coloring. Background and empty regions must be pure white with zero gray tint. No grayscale shading, hatching, crosshatching, texture fills, text, logos, page borders, frames, or watermarks.";

export const BASE_STYLES = {
  FAST: "Create a quick pre-processing pass that simplifies noise and preserves composition, identity, and readable major shapes. Prioritize speed with clean, uncluttered forms suitable for coloring-page line-art conversion.",
  STANDARD:
    "Create a balanced illustrative pass with clear edges, readable faces, and medium detail. Preserve all people, pose, and scene layout while improving separation of foreground and background for premium line-art conversion.",
  GHIBLI:
    "Create a whimsical hand-drawn animated look with soft organic forms, gentle cinematic mood, and natural scenery cues. Preserve identity, expression, and scene structure without distortion so it converts cleanly to line art.",
  CARTOON:
    "Create a playful cartoon style with rounded forms, bold silhouettes, friendly proportions, and clear shape language. Preserve pose and scene layout while emphasizing visual clarity for coloring pages.",
  MANGA:
    "Create a manga-inspired style with expressive character features, strong contour readability, and clean compositional lines. Preserve identity and pose while keeping background structure simplified for clean line-art extraction.",
} as const;

export type StyleId = keyof typeof BASE_STYLES;

export const STYLE_PRESETS: Record<
  StyleId,
  {
    label: string;
    subtitle: string;
    helper: string;
    requiresAccount?: boolean;
  }
> = {
  FAST: {
    label: "Fast",
    subtitle: "Best for quick drafts",
    helper: "Speed-first simplification",
  },
  STANDARD: {
    label: "Standard",
    subtitle: "Cleaner lines and details",
    helper: "Balanced quality and speed",
  },
  GHIBLI: {
    label: "Ghibli",
    subtitle: "Whimsical lines",
    helper: "Soft cinematic mood",
  },
  CARTOON: {
    label: "Cartoon",
    subtitle: "Kid friendly",
    helper: "Playful rounded shapes",
  },
  MANGA: {
    label: "Manga",
    subtitle: "Bold outlines",
    helper: "Expressive line work",
  },
};
