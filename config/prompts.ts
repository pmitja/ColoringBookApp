// Shortened prompts to fit within 77 token limit
export const PIXAR_PROMPT = `A group photo of real people reimagined as Pixar-style 3D cartoon characters. Each person should have soft, rounded facial features, expressive shiny eyes, and simplified clothing in the style of animated movies. The original background, including its structure and layout, should be preserved, but stylized in the same cartoon 3D look — with soft lighting, smooth textures, and vibrant yet natural colors. The entire image, including the real scene's background elements, should appear as if part of a Pixar or DreamWorks movie frame, without changing their arrangement or content. Ensure no one is squinting or cross-eyed—portray all eyes fully open and natural.`

export const COLORING_BOOK_PROMPT = `A clean black and white line drawing of a group photo, simplified for a children's coloring book. All people and background elements should be represented using bold, smooth outlines with no shading or solid black fills. Hair, eyes, clothing, and environment must be open for coloring, with only line work to define the shapes. The style should be playful, friendly, and suitable for kids to color – like a page from a professional coloring book. Maintain consistency across the entire image.`

const TEST = "A group photo of real people reimagined as Pixar-style 3D cartoon characters. Each person should have soft, rounded facial features, expressive shiny eyes, and simplified clothing in the style of animated movies. The original background, including its structure and layout, should be preserved, but stylized in the same cartoon 3D look — with soft lighting, smooth textures, and vibrant yet natural colors. The entire image, including the real scene's background elements, should appear as if part of a Pixar or DreamWorks movie frame, without changing their arrangement or content. **If any person’s eyes are closed in the original photo, retain their closed-eye expression in the cartoon output."

const TEST_1 = "Restyle to black and white Lineart style"
const TEST_2 = "Restyle to Claymation style"

export const INTO_LINEART = "Turn this photo into a clean line drawing with minimal detail and smooth contours without colors"
export const INTO_PIXAR = "Reimagine this photo as if it were a Pixar , vibrant colors, soft shadows, big eyes, rounded features, emotional depth, and animated charm. Ensure no one is squinting or cross-eyed—portray all eyes fully open and natural."

export const CARTOON_PROMPT = "Convert this image into a classic cartoon or comic book drawing. Add bold black outlines and use vibrant flat colors only on people."
export const AFTER_CARTOON_PROMPT = "Turn this photo into a clean line drawing with minimal detail and smooth contours without colors"

export const DIRECT_WITHOUT_CARTOON = "Turn this photo into a clean line drawing with minimal detail and smooth contours"