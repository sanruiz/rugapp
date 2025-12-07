import { google } from '@ai-sdk/google';
import { BatchRequest, ProcessedRug } from '@/types/rug';
import { downloadImageAsBase64 } from './rug-utils';
import { logger } from "./logger";

// Track statistics for batch processing
interface BatchStats {
  total: number;
  withImages: number;
  withoutImages: number;
  imageDownloadFailed: number;
  skipped: number;
}

export class GeminiService {
  private model = google("gemini-2.5-flash");

  constructor(private apiKey: string) {
    if (!apiKey) {
      throw new Error("Gemini API key is required");
    }
  }

  /**
   * Create a batch request for a single rug
   * Returns { request, hasImage } or null if failed
   */
  async createBatchRequest(
    rug: ProcessedRug,
    includeImage: boolean = true
  ): Promise<{ request: BatchRequest; hasImage: boolean } | null> {
    try {
      const parts: Array<{
        text?: string;
        inline_data?: { mime_type: string; data: string };
      }> = [];

      // Add the text prompt with integrated negative concepts and clear instructions
      parts.push({
        text: `${rug.prompt} Ensure seamless integration and harmonious blending of the rug within the scene so it appears naturally part of the environment, not artificially placed or pasted on. Avoid low quality, overexposed, watermarks, extra rugs, distorted perspective, cartoon style, text, logos, blurry elements, or graininess.

Using the rug image provided above, generate a photorealistic interior scene image that matches these exact requirements. The generated image must show the EXACT rug from the provided image placed in the scene as described.`,
      });

      // Track if we successfully added an image
      let hasImage = false;

      // Add image if available and requested
      if (includeImage && rug.imageLink) {
        logger.debug("BATCH", `Downloading image for rug ${rug.sku}...`, {
          sku: rug.sku,
          imageUrl: rug.imageLink.substring(0, 60),
        });

        const imageBase64 = await downloadImageAsBase64(rug.imageLink);

        if (imageBase64) {
          parts.push({
            inline_data: {
              mime_type: "image/jpeg",
              data: imageBase64,
            },
          });
          hasImage = true;
          logger.debug("BATCH", `✓ Image added for rug ${rug.sku}`, {
            sku: rug.sku,
          });
        } else {
          logger.warn(
            "BATCH",
            `✗ Failed to download image for rug ${rug.sku}`,
            {
              sku: rug.sku,
              imageUrl: rug.imageLink,
            }
          );
        }
      } else if (includeImage && !rug.imageLink) {
        logger.warn("BATCH", `Rug ${rug.sku} has no image URL`, {
          sku: rug.sku,
        });
      }

      const batchRequest: BatchRequest = {
        key: `rug-${rug.sku}`,
        request: {
          contents: [
            {
              parts: parts,
            },
          ],
        },
      };

      return { request: batchRequest, hasImage };
    } catch (error) {
      logger.error(
        "BATCH",
        `Error creating batch request for rug ${rug.sku}`,
        error as Error,
        { sku: rug.sku }
      );
      return null;
    }
  }

  /**
   * Create batch requests for multiple rugs with detailed statistics
   */
  async createBatchRequests(
    rugs: ProcessedRug[],
    includeImages: boolean = true,
    onProgress?: (processed: number, total: number) => void
  ): Promise<BatchRequest[]> {
    const requests: BatchRequest[] = [];
    const total = rugs.length;

    // Initialize stats
    const stats: BatchStats = {
      total,
      withImages: 0,
      withoutImages: 0,
      imageDownloadFailed: 0,
      skipped: 0,
    };

    logger.info("BATCH", `Starting batch request creation for ${total} rugs`, {
      total,
      includeImages,
    });

    for (let i = 0; i < rugs.length; i++) {
      const rug = rugs[i];
      const result = await this.createBatchRequest(rug, includeImages);

      if (result) {
        requests.push(result.request);

        if (includeImages) {
          if (result.hasImage) {
            stats.withImages++;
          } else if (rug.imageLink) {
            stats.imageDownloadFailed++;
          } else {
            stats.withoutImages++;
          }
        }
      } else {
        stats.skipped++;
        logger.warn(
          "BATCH",
          `Skipped rug ${rug.sku} - failed to create request`,
          { sku: rug.sku }
        );
      }

      if (onProgress) {
        onProgress(i + 1, total);
      }

      // Log progress every 25 rugs
      if ((i + 1) % 25 === 0 || i === total - 1) {
        logger.info("BATCH", `Progress: ${i + 1}/${total} rugs processed`, {
          processed: i + 1,
          total,
          withImages: stats.withImages,
          failed: stats.imageDownloadFailed,
        });
      }
    }

    // Final summary
    logger.info("BATCH", `Batch creation complete`, {
      totalRugs: stats.total,
      requestsCreated: requests.length,
      withImages: stats.withImages,
      withoutImages: stats.withoutImages,
      imageDownloadFailed: stats.imageDownloadFailed,
      skipped: stats.skipped,
      successRate: `${Math.round((requests.length / stats.total) * 100)}%`,
      imageSuccessRate: includeImages
        ? `${Math.round(
            (stats.withImages /
              (stats.withImages + stats.imageDownloadFailed || 1)) *
              100
          )}%`
        : "N/A",
    });

    // Warn if many images failed
    if (stats.imageDownloadFailed > 0) {
      logger.warn(
        "BATCH",
        `⚠️ ${stats.imageDownloadFailed} images failed to download`,
        {
          failed: stats.imageDownloadFailed,
          percentage: `${Math.round(
            (stats.imageDownloadFailed / total) * 100
          )}%`,
        }
      );
    }

    return requests;
  }

  /**
   * Generate JSONL content for batch API
   */
  generateJSONL(batchRequests: BatchRequest[]): string {
    return batchRequests
      .map((request) => {
        try {
          return JSON.stringify(request);
        } catch (error) {
          console.error("Error stringifying request:", error, request);
          return null;
        }
      })
      .filter(Boolean)
      .join("\n");
  }

  /**
   * Escape text for safe JSON usage
   */
  private escapeJsonText(text: string): string {
    if (!text) return "";
    return text
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t");
  }

  /**
   * Process a single rug with direct API call (for testing)
   */
  async processRug(rug: ProcessedRug): Promise<string | null> {
    try {
      // For direct API calls, we'd use the Vercel AI SDK's generate function
      // This is a simplified version - you might want to use the actual AI SDK methods

      return `Generated description for ${rug.title} (${rug.sku}): ${rug.prompt}`;
    } catch (error) {
      console.error(`Error processing rug ${rug.sku}:`, error);
      return null;
    }
  }
}
