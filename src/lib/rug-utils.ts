import { RugData } from '@/types/rug';

// ========= CONFIG =========
export const NEGATIVE_PROMPT = "low quality, overexposed, watermark, extra rugs, distorted perspective, cartoon, text, logo";

// ========= DECOR STYLE BY COLLECTION =========
const decorStyleByCollection: Record<string, string> = {
  "Antique": "Traditional Decor",
  "Clearance": "Modern Decor",
  "Fine Oriental": "Traditional Decor",
  "Flat Weave": "Eclectic Decor",
  "Hand-Loomed": "Modern Decor",
  "Heriz": "Traditional Decor",
  "Kazak": "Transitional Decor",
  "Khotan and Samarkand": "Traditional Decor",
  "Mamluk": "Transitional Decor",
  "Modern & Contemporary": "Modern Decor",
  "Oushak and Peshawar": "Transitional Decor",
  "Persian": "Traditional Decor",
  "Program Rugs": "Transitional Decor",
  "Rajasthan": "Traditional Decor",
  "Silk": "Modern Decor",
  "Transitional": "Transitional Decor",
  "Tribal & Geometric": "Transitional Decor",
  "Vintage": "Transitional Decor",
  "White Wash Vintage & Silver Wash": "Modern Decor",
  "Wool And Silk": "Transitional Decor"
};

const ambienteByShape: Record<string, string> = {
  runner: "hallway",
  rectangle: "living room, parlor or library",
  round: "living room with a curved couch or a dining room with a round table",
  square: "square dining room or a balanced living room"
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

export function buildPrompt(rug: RugData): string {
  const colores = [
    rug.fieldColor,
    rug.borderColor,
    rug.exactFieldColor,
    rug.color,
    list(rug.otherColors || [])
  ]
    .filter(Boolean)
    .join(", ") || "neutral";

  const sizeTxt = rug.exactSize || rug.size || "area rug";
  const forma = rug.shape ? rug.shape.toLowerCase() : "rectangle";

  const decorPhrase = rug.decorStyle || "neutral decor";
  const ambientePhrase = rug.ambiente || "living room";

  const usePhrase = rug.rugtype
    ? `${rug.rugtype.toLowerCase()} rug`
    : "indoor rug";

  const parts = [
    // 1) Ambiente + estilo + uso
    `Photo-realistic ${ambientePhrase} in ${decorPhrase}, featuring an ${usePhrase}, with natural daylight.`,
    // 2) Posición de la alfombra
    `Place a ${forma} area rug (${sizeTxt}) centered under a coffee table.`,
    // 3) Colección / estilo / origen
    `Rug collection: ${rug.primaryCategory || "unspecified"}; secondary: ${rug.secondaryCategory || "none"}; style: ${rug.style || "traditional"}; origin: ${rug.origin || "unknown"}.`,
    // 4) Materiales, tejido, pile, colores
    `Pile: ${rug.pile || "wool"}; foundation: ${rug.foundation || "cotton"}; material: ${rug.material || "wool"}; weave type: ${rug.weavetype || "hand-knotted"}; dominant colors: ${colores}.`,
    // 5) Proportions preservation
    `Preserve the rug's real physical proportions exactly as shown in the product image. Maintain the correct length-to-width ratio with no distortion, stretching, compression, or reshaping. Render the rug in the scene at a realistic scale relative to the room and surrounding objects. Ensure the geometry, outline, and aspect ratio match the original product image precisely, keeping the true shape whether it is rectangular, round, square, or runner. Do not modify the proportions or crop any part of the rug. Retain the full original dimensions so the rug appears naturally sized and consistent with its actual measurements.`,
    // 6) Extras de render
    `Hardwood floor, soft shadows, realistic perspective from eye level (~1.2m), 35mm lens, high detail.`
  ];

  return parts.join(" ");
}

export function hashToSeed(str: string): number {
  if (!str) {
    return Math.floor(Math.random() * 1e9);
  }
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // 32-bit
  }
  return Math.abs(hash) % 2147483647;
}

export async function downloadImageAsBase64(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    
    return base64;
  } catch (error) {
    console.error('Error downloading image:', error);
    return null;
  }
}
