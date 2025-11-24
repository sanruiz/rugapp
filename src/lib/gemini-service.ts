import { google } from '@ai-sdk/google';
import { BatchRequest, ProcessedRug } from '@/types/rug';
import { downloadImageAsBase64 } from './rug-utils';

export class GeminiService {
  private model = google('gemini-2.5-flash');

  constructor(private apiKey: string) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
  }

  /**
   * Create a batch request for a single rug
   */
  async createBatchRequest(rug: ProcessedRug, includeImage: boolean = true): Promise<BatchRequest | null> {
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

      // Add image if available and requested
      if (includeImage && rug.imageLink) {
        const imageBase64 = await downloadImageAsBase64(rug.imageLink);
        if (imageBase64) {
          parts.push({
            inline_data: {
              mime_type: "image/jpeg",
              data: imageBase64,
            },
          });
        }
      }

      const batchRequest: BatchRequest = {
        key: `rug-${rug.sku}`,
        request: {
          contents: [
            {
              parts: parts,
            },
          ],
          // Removed generation_config as it's not relevant for image generation
        },
      };

      return batchRequest;
    } catch (error) {
      console.error(`Error creating batch request for rug ${rug.sku}:`, error);
      return null;
    }
  }

  /**
   * Create batch requests for multiple rugs
   */
  async createBatchRequests(
    rugs: ProcessedRug[], 
    includeImages: boolean = true,
    onProgress?: (processed: number, total: number) => void
  ): Promise<BatchRequest[]> {
    const requests: BatchRequest[] = [];
    const total = rugs.length;

    for (let i = 0; i < rugs.length; i++) {
      const rug = rugs[i];
      const request = await this.createBatchRequest(rug, includeImages);
      
      if (request) {
        requests.push(request);
      }

      if (onProgress) {
        onProgress(i + 1, total);
      }
    }

    return requests;
  }

  /**
   * Generate JSONL content for batch API
   */
  generateJSONL(batchRequests: BatchRequest[]): string {
    return batchRequests
      .map(request => {
        try {
          return JSON.stringify(request);
        } catch (error) {
          console.error('Error stringifying request:', error, request);
          return null;
        }
      })
      .filter(Boolean)
      .join('\n');
  }

  /**
   * Escape text for safe JSON usage
   */
  private escapeJsonText(text: string): string {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
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
