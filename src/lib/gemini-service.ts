import { google } from '@ai-sdk/google';
import { BatchRequest, ProcessedRug } from '@/types/rug';
import { ArtworkBatchRequest, ProcessedArtwork } from '@/types/artwork';
import { downloadImageAsBase64 } from './rug-utils';
import {
  getImageAsBase64,
  getAspectRatioConfig,
  detectMimeType,
} from "./artwork-utils";
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
    index: number,
    includeImage: boolean = true
  ): Promise<{ request: BatchRequest; hasImage: boolean } | null> {
    try {
      const parts: Array<{
        text?: string;
        inline_data?: { mime_type: string; data: string };
      }> = [];

      // Add the text prompt with integrated negative concepts and clear instructions
      parts.push({
        text: `${rug.prompt} Ensure seamless integration and harmonious blending of the rug within the scene so it appears naturally part of the environment, not artificially placed or pasted on. IMPORTANT: The source rug image may contain text overlays like "Light Side" or other labels - these must NOT appear in the generated image. Remove any text, labels, or watermarks from the rug and show only the clean rug pattern. Avoid low quality, overexposed, watermarks, extra rugs, distorted perspective, cartoon style, text, logos, blurry elements, or graininess.

Using the rug image provided above, generate a photorealistic interior scene image that matches these exact requirements. The generated image must show the EXACT rug pattern from the provided image placed in the scene as described, but without any text overlays or labels that may appear on the source image.`,
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
            `✗ Failed to download image for rug ${rug.sku || index}`,
            {
              sku: rug.sku,
              imageUrl: rug.imageLink,
            }
          );
        }
      } else if (includeImage && !rug.imageLink) {
        logger.warn("BATCH", `Rug ${rug.sku || index} has no image URL`, {
          sku: rug.sku,
        });
      }

      // Generate a unique key - use SKU if available, otherwise use index
      const rugKey = rug.sku ? `rug-${rug.sku}` : `rug-idx-${index}`;

      const batchRequest: BatchRequest = {
        key: rugKey,
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
        `Error creating batch request for rug ${rug.sku || index}`,
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
      const result = await this.createBatchRequest(rug, i, includeImages);

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

  // ========= ARTWORK PROCESSING METHODS =========

  /**
   * Create a batch request for a single artwork
   */
  async createArtworkBatchRequest(
    artwork: ProcessedArtwork,
    index: number,
    includeImage: boolean = true
  ): Promise<{ request: ArtworkBatchRequest; hasImage: boolean } | null> {
    try {
      const parts: Array<{
        text?: string;
        inline_data?: { mime_type: string; data: string };
      }> = [];

      // Add the text prompt with negative concepts
      parts.push({
        text: `${artwork.prompt}

Using the artwork image provided, generate a photorealistic photograph showing this exact artwork displayed on a gallery wall. The artwork must be reproduced exactly as provided - do not modify, reinterpret, or stylize the original artwork. The generated image should show the artwork mounted on a wall with professional gallery lighting.

IMPORTANT: Reproduce the artwork EXACTLY as shown in the source image. Do not add, remove, or change any elements of the original artwork.`,
      });

      let hasImage = false;

      if (includeImage && (artwork.imageLink || artwork.localImagePath)) {
        const imageSource = artwork.localImagePath || artwork.imageLink;
        logger.debug(
          "ARTWORK_BATCH",
          `Loading image for artwork ${artwork.sku}...`,
          {
            sku: artwork.sku,
            source: artwork.localImagePath ? "local" : "url",
            path: imageSource?.substring(0, 60),
          },
        );

        const imageBase64 = await getImageAsBase64(
          artwork.imageLink,
          artwork.localImagePath,
        );

        if (imageBase64) {
          const mimeType = detectMimeType(imageSource || "image.jpg");
          parts.push({
            inline_data: {
              mime_type: mimeType,
              data: imageBase64,
            },
          });
          hasImage = true;
          logger.debug(
            "ARTWORK_BATCH",
            `✓ Image added for artwork ${artwork.sku}`,
            {
              sku: artwork.sku,
              source: artwork.localImagePath ? "local" : "url",
            },
          );
        } else {
          logger.warn(
            "ARTWORK_BATCH",
            `✗ Failed to load image for artwork ${artwork.sku || index}`,
            {
              sku: artwork.sku,
              imageUrl: artwork.imageLink,
              localPath: artwork.localImagePath,
            },
          );
        }
      }

      const artworkKey = artwork.sku ? `artwork-${artwork.sku}` : `artwork-idx-${index}`;
      const aspectRatioConfig = getAspectRatioConfig(artwork.aspectRatio);

      const batchRequest: ArtworkBatchRequest = {
        key: artworkKey,
        request: {
          contents: [
            {
              parts: parts,
            },
          ],
          generation_config: {
            response_modalities: ["IMAGE"],
            image_config: {
              aspect_ratio: aspectRatioConfig,
            },
          },
        },
      };

      return { request: batchRequest, hasImage };
    } catch (error) {
      logger.error(
        "ARTWORK_BATCH",
        `Error creating batch request for artwork ${artwork.sku || index}`,
        error as Error,
        { sku: artwork.sku }
      );
      return null;
    }
  }

  /**
   * Create batch requests for multiple artworks
   */
  async createArtworkBatchRequests(
    artworks: ProcessedArtwork[],
    includeImages: boolean = true,
    onProgress?: (processed: number, total: number) => void
  ): Promise<ArtworkBatchRequest[]> {
    const requests: ArtworkBatchRequest[] = [];
    const total = artworks.length;

    const stats = {
      total,
      withImages: 0,
      withoutImages: 0,
      imageDownloadFailed: 0,
      skipped: 0,
    };

    logger.info("ARTWORK_BATCH", `Starting batch request creation for ${total} artworks`, {
      total,
      includeImages,
    });

    for (let i = 0; i < artworks.length; i++) {
      const artwork = artworks[i];
      const result = await this.createArtworkBatchRequest(artwork, i, includeImages);

      if (result) {
        requests.push(result.request);

        if (includeImages) {
          if (result.hasImage) {
            stats.withImages++;
          } else if (artwork.imageLink) {
            stats.imageDownloadFailed++;
          } else {
            stats.withoutImages++;
          }
        }
      } else {
        stats.skipped++;
        logger.warn(
          "ARTWORK_BATCH",
          `Skipped artwork ${artwork.sku} - failed to create request`,
          { sku: artwork.sku }
        );
      }

      if (onProgress) {
        onProgress(i + 1, total);
      }

      if ((i + 1) % 25 === 0 || i === total - 1) {
        logger.info("ARTWORK_BATCH", `Progress: ${i + 1}/${total} artworks processed`, {
          processed: i + 1,
          total,
          withImages: stats.withImages,
          failed: stats.imageDownloadFailed,
        });
      }
    }

    logger.info("ARTWORK_BATCH", `Artwork batch creation complete`, {
      totalArtworks: stats.total,
      requestsCreated: requests.length,
      withImages: stats.withImages,
      withoutImages: stats.withoutImages,
      imageDownloadFailed: stats.imageDownloadFailed,
      skipped: stats.skipped,
      successRate: `${Math.round((requests.length / stats.total) * 100)}%`,
    });

    return requests;
  }

  /**
   * Generate JSONL content for artwork batch API
   */
  generateArtworkJSONL(batchRequests: ArtworkBatchRequest[]): string {
    return batchRequests
      .map((request) => {
        try {
          return JSON.stringify(request);
        } catch (error) {
          console.error("Error stringifying artwork request:", error, request);
          return null;
        }
      })
      .filter(Boolean)
      .join("\n");
  }
}
