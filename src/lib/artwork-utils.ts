import { ArtworkData, AspectRatio } from "@/types/artwork";
import { logger } from "./logger";

/**
 * Negative prompt to avoid common issues in artwork image generation
 */
export const ARTWORK_NEGATIVE_PROMPT =
  "low quality, blurry, distorted, pixelated, watermark, text overlay, logo, harsh shadows, glare, reflection, cropped artwork, multiple artworks, cartoon style, digital artifacts";

/**
 * Wall style options based on artwork style
 */
const wallStyleByArtworkStyle: Record<string, string> = {
  "Modern": "clean white gallery wall with minimal texture",
  "Contemporary": "smooth light gray museum wall",
  "Classical": "warm off-white wall with subtle texture",
  "Impressionist": "soft cream-colored gallery wall",
  "Abstract": "pure white contemporary gallery wall",
  "Renaissance": "warm beige museum wall with subtle texture",
  "Pop Art": "bright white gallery wall",
  "Minimalist": "pristine white wall with no texture",
  "Traditional": "warm neutral gallery wall",
  "default": "elegant off-white gallery wall with subtle texture",
};

/**
 * Get wall style description based on artwork style
 */
export function getWallStyle(artworkStyle?: string): string {
  if (!artworkStyle) return wallStyleByArtworkStyle["default"];
  
  const normalizedStyle = artworkStyle.trim();
  return wallStyleByArtworkStyle[normalizedStyle] || wallStyleByArtworkStyle["default"];
}

/**
 * Map aspect ratio to Gemini API format
 */
export function getAspectRatioConfig(aspectRatio: AspectRatio): string {
  const aspectRatioMap: Record<AspectRatio, string> = {
    "1:1": "1:1",
    "1:2": "1:2",
    "2:1": "2:1",
  };
  return aspectRatioMap[aspectRatio] || "1:1";
}

/**
 * Normalize aspect ratio string from CSV to valid AspectRatio type
 */
export function normalizeAspectRatio(input: string): AspectRatio {
  const normalized = (input || "").trim().toLowerCase();
  
  switch (normalized) {
    case "1:1":
    case "1x1":
    case "square":
      return "1:1";
    case "1:2":
    case "1x2":
    case "portrait":
    case "tall":
      return "1:2";
    case "2:1":
    case "2x1":
    case "landscape":
    case "wide":
      return "2:1";
    default:
      logger.warn("ARTWORK", `Unknown aspect ratio "${input}", defaulting to 1:1`);
      return "1:1";
  }
}

/**
 * Build the prompt for artwork image generation
 * Creates a photorealistic gallery/wall display scene
 */
export function buildArtworkPrompt(artwork: ArtworkData): string {
  const wallStyle = getWallStyle(artwork.style);
  
  const artistInfo = artwork.artist 
    ? `by ${artwork.artist}` 
    : "";
  
  const mediumInfo = artwork.medium 
    ? `(${artwork.medium})` 
    : "";
  
  const styleInfo = artwork.style 
    ? `in ${artwork.style} style` 
    : "";

  const parts = [
    // 1) Main scene description
    `A photorealistic museum-quality photograph showing "${artwork.title}" ${artistInfo} ${mediumInfo} ${styleInfo} displayed on an elegant gallery wall.`,
    
    // 2) Composition and spacing
    `The artwork is perfectly centered in the frame with approximately 15-20% of ${wallStyle} visible as background around all edges. The wall extends beyond the artwork creating a natural gallery setting.`,
    
    // 3) Lighting instructions
    `Professional gallery lighting illuminates the artwork with soft, diffused light from above. The lighting creates subtle, natural shadows beneath the artwork that add depth and three-dimensionality. No harsh reflections, glare, or hot spots on the artwork surface. The lighting should enhance the colors and details of the original artwork without washing them out.`,
    
    // 4) Realism instructions
    `The artwork must appear as if it is actually mounted on a real physical wall - not digitally overlaid or composited. The edges of the artwork should integrate naturally with the wall surface. If the artwork has a frame, it should cast appropriate shadows on the wall.`,
    
    // 5) Artwork preservation
    `CRITICAL: Maintain the exact colors, brushstrokes, details, textures, and proportions of the original artwork. Do not modify, enhance, or reinterpret the artwork itself. The artwork should be displayed exactly as provided in the source image.`,
    
    // 6) Technical quality
    `High resolution, sharp focus on the artwork, realistic perspective from viewer eye level, professional gallery photography style.`,
    
    // 7) Negative concepts integrated
    `Avoid: ${ARTWORK_NEGATIVE_PROMPT}.`,
  ];

  return parts.join(" ");
}

/**
 * Download image as base64 string
 * Reuses the same logic from rug-utils but exported here for convenience
 */
export async function downloadImageAsBase64(
  imageUrl: string
): Promise<string | null> {
  if (!imageUrl) {
    logger.warn("ARTWORK_IMAGE", "No image URL provided", { imageUrl });
    return null;
  }

  try {
    logger.debug("ARTWORK_IMAGE", `Downloading image...`, {
      url: imageUrl.substring(0, 80),
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ArtworkApp/1.0)",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.error(
        "ARTWORK_IMAGE",
        `Failed to download image: HTTP ${response.status}`,
        undefined,
        {
          url: imageUrl,
          status: String(response.status),
          statusText: response.statusText,
        }
      );
      return null;
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.startsWith("image/")) {
      logger.warn("ARTWORK_IMAGE", `Invalid content type: ${contentType}`, {
        url: imageUrl,
        contentType,
      });
    }

    const buffer = await response.arrayBuffer();

    if (buffer.byteLength === 0) {
      logger.error("ARTWORK_IMAGE", "Downloaded image is empty (0 bytes)", undefined, {
        url: imageUrl,
      });
      return null;
    }

    const base64 = Buffer.from(buffer).toString("base64");

    if (!base64 || base64.length < 100) {
      logger.error(
        "ARTWORK_IMAGE",
        "Base64 conversion failed or too small",
        undefined,
        {
          url: imageUrl,
          base64Length: base64?.length || 0,
        }
      );
      return null;
    }

    logger.debug("ARTWORK_IMAGE", `Image downloaded successfully`, {
      url: imageUrl.substring(0, 50),
      sizeKB: Math.round(buffer.byteLength / 1024),
      base64Length: base64.length,
    });

    return base64;
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      logger.error("ARTWORK_IMAGE", "Image download timed out (30s)", undefined, {
        url: imageUrl,
      });
    } else {
      logger.error(
        "ARTWORK_IMAGE",
        `Error downloading image: ${(error as Error).message}`,
        error as Error,
        {
          url: imageUrl,
        }
      );
    }
    return null;
  }
}
