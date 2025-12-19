import { RugData } from "@/types/rug";
import { logger } from "./logger";

// ========= CONFIG =========
export const NEGATIVE_PROMPT =
  "low quality, overexposed, watermark, extra rugs, distorted perspective, cartoon, text, logo";

// ========= DECOR STYLE BY COLLECTION =========
const decorStyleByCollection: Record<string, string> = {
  Antique: "Traditional Decor",
  Clearance: "Modern Decor",
  "Fine Oriental": "Traditional Decor",
  "Flat Weave": "Eclectic Decor",
  "Hand-Loomed": "Modern Decor",
  Heriz: "Traditional Decor",
  Kazak: "Transitional Decor",
  "Khotan and Samarkand": "Traditional Decor",
  Mamluk: "Transitional Decor",
  "Modern & Contemporary": "Modern Decor",
  "Oushak and Peshawar": "Transitional Decor",
  Persian: "Traditional Decor",
  "Program Rugs": "Transitional Decor",
  Rajasthan: "Traditional Decor",
  Silk: "Modern Decor",
  Transitional: "Transitional Decor",
  "Tribal & Geometric": "Transitional Decor",
  Vintage: "Transitional Decor",
  "White Wash Vintage & Silver Wash": "Modern Decor",
  "Wool And Silk": "Transitional Decor",
};

const ambienteByShape: Record<string, string> = {
  runner: "hallway",
  rectangle: "living room, parlor or library",
  round: "living room with a curved couch or a dining room with a round table",
  square: "square dining room or a balanced living room",
};

export function getDecorStyle(primaryCategory: string): string {
  const category = primaryCategory?.trim();
  if (!category) return "neutral decor";
  return decorStyleByCollection[category] || "neutral decor";
}

export function normalizeShape(shape: string): string {
  const s = (shape || "").toLowerCase().trim();

  switch (s) {
    case "runner":
      return "Runner";
    case "rectangle":
      return "Rectangle";
    case "round":
      return "Round";
    case "square":
      return "Square";
    default:
      return "Rectangle";
  }
}

export function getAmbienteFromShape(shape: string): string {
  const key = (shape || "").toLowerCase();
  return ambienteByShape[key] || "living room";
}

function list(arr: string[]): string {
  if (Array.isArray(arr)) return arr.filter(Boolean).join(", ");
  return "";
}

// Helper to determine if rug is large based on size string
function isLargeRug(sizeStr: string): boolean {
  // Parse dimensions like "9' x 12'", "8x10", "10' 2\" x 14' 3\"" etc.
  const matches = sizeStr.match(/(\d+)['\s"]*(?:\d+)?['\s"]*\s*[xX×]\s*(\d+)/);
  if (matches) {
    const width = parseInt(matches[1], 10);
    const length = parseInt(matches[2], 10);
    // Consider large if either dimension >= 9 feet or area >= 64 sq ft
    return width >= 9 || length >= 9 || width * length >= 64;
  }
  return false;
}

export function buildPrompt(rug: RugData): string {
  const colores =
    [
      rug.fieldColor,
      rug.borderColor,
      rug.exactFieldColor,
      rug.color,
      list(rug.otherColors || []),
    ]
      .filter(Boolean)
      .join(", ") || "neutral";

  const sizeTxt = rug.exactSize || rug.size || "area rug";
  const forma = rug.shape ? rug.shape.toLowerCase() : "rectangle";
  const isRunner = forma === "runner";
  const isRound = forma === "round";
  const isSquare = forma === "square";
  const isLarge = isLargeRug(sizeTxt);

  const decorPhrase = rug.decorStyle || "neutral decor";

  const usePhrase = rug.rugtype
    ? `${rug.rugtype.toLowerCase()} rug`
    : "indoor rug";

  // Determine ambiente and placement based on shape and size
  let ambientePhrase: string;
  let placementInstruction: string;

  if (isRunner) {
    // Runners always go in hallways without furniture on top
    ambientePhrase = "elegant hallway";
    placementInstruction = `Place a runner rug (${sizeTxt}) centered lengthwise along the hallway floor. No furniture on top of the rug. The runner should extend along the corridor with clear space on both sides.`;
  } else if (isRound) {
    // Round rugs: dining room with round table or living room with curved seating
    ambientePhrase = "dining room with a round table";
    placementInstruction = `Place a round area rug (${sizeTxt}) centered under a round dining table. The rug should extend beyond the table edges to accommodate chairs.`;
  } else if (isSquare) {
    // Square rugs: square dining room or balanced living room
    ambientePhrase = "square dining room";
    placementInstruction = `Place a square area rug (${sizeTxt}) centered under a dining table. The rug should be proportional to the room with balanced spacing on all sides.`;
  } else if (isLarge) {
    // Large rectangular rugs: parlor, library, or dining room - no coffee table
    ambientePhrase = "spacious parlor or library";
    placementInstruction = `Place a large rectangular area rug (${sizeTxt}) as the room's centerpiece. Position elegant seating around the rug's perimeter. No furniture directly on top of the rug center.`;
  } else {
    // Medium/small rectangular rugs: living room with coffee table
    ambientePhrase = "cozy living room";
    placementInstruction = `Place a ${forma} area rug (${sizeTxt}) centered under a coffee table, with a sofa and armchairs arranged around it.`;
  }

  const parts = [
    // 1) Ambiente + estilo + uso
    `Photo-realistic ${ambientePhrase} in ${decorPhrase}, featuring an ${usePhrase}, with natural daylight.`,
    // 2) Posición de la alfombra (diferente para runners)
    placementInstruction,
    // 3) Colección / estilo / origen
    `Rug collection: ${rug.primaryCategory || "unspecified"}; secondary: ${
      rug.secondaryCategory || "none"
    }; style: ${rug.style || "traditional"}; origin: ${
      rug.origin || "unknown"
    }.`,
    // 4) Materiales, tejido, pile, colores
    `Pile: ${rug.pile || "wool"}; foundation: ${
      rug.foundation || "cotton"
    }; material: ${rug.material || "wool"}; weave type: ${
      rug.weavetype || "hand-knotted"
    }; dominant colors: ${colores}.`,
    // 5) Proportions preservation
    `Preserve the rug's real physical proportions exactly as shown in the product image. Maintain the correct length-to-width ratio with no distortion, stretching, compression, or reshaping. Render the rug in the scene at a realistic scale relative to the room and surrounding objects. Ensure the geometry, outline, and aspect ratio match the original product image precisely, keeping the true shape whether it is rectangular, round, square, or runner. Do not modify the proportions or crop any part of the rug. Retain the full original dimensions so the rug appears naturally sized and consistent with its actual measurements.`,
    // 6) Extras de render
    `Hardwood floor, soft shadows, realistic perspective from eye level (~1.2m), 35mm lens, high detail.`,
  ];

  return parts.join(" ");
}

export function hashToSeed(str: string): number {
  if (!str) {
    return Math.floor(Math.random() * 1e9);
  }

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // 32-bit
  }
  return Math.abs(hash) % 2147483647;
}

export async function downloadImageAsBase64(
  imageUrl: string
): Promise<string | null> {
  if (!imageUrl) {
    logger.warn("IMAGE", "No image URL provided", { imageUrl });
    return null;
  }

  try {
    logger.debug("IMAGE", `Downloading image...`, {
      url: imageUrl.substring(0, 80),
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RugApp/1.0)",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.error(
        "IMAGE",
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
      logger.warn("IMAGE", `Invalid content type: ${contentType}`, {
        url: imageUrl,
        contentType,
      });
    }

    const buffer = await response.arrayBuffer();

    if (buffer.byteLength === 0) {
      logger.error("IMAGE", "Downloaded image is empty (0 bytes)", undefined, {
        url: imageUrl,
      });
      return null;
    }

    if (buffer.byteLength < 100) {
      logger.warn(
        "IMAGE",
        `Image suspiciously small: ${buffer.byteLength} bytes`,
        { url: imageUrl }
      );
    }

    const base64 = Buffer.from(buffer).toString("base64");

    // Validate base64 is valid
    if (!base64 || base64.length < 100) {
      logger.error(
        "IMAGE",
        "Base64 conversion failed or too small",
        undefined,
        {
          url: imageUrl,
          base64Length: base64?.length || 0,
        }
      );
      return null;
    }

    logger.debug("IMAGE", `Image downloaded successfully`, {
      url: imageUrl.substring(0, 50),
      sizeKB: Math.round(buffer.byteLength / 1024),
      base64Length: base64.length,
    });

    return base64;
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      logger.error("IMAGE", "Image download timed out (30s)", undefined, {
        url: imageUrl,
      });
    } else {
      logger.error(
        "IMAGE",
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
