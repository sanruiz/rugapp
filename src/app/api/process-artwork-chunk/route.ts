import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/lib/gemini-service';
import { logger } from '@/lib/logger';
import { ProcessedArtwork } from '@/types/artwork';

export const maxDuration = 300; // 5 minutes timeout

interface ArtworkChunkProcessRequest {
  artworks: ProcessedArtwork[];
  chunkIndex: number;
  includeImages: boolean;
}

/**
 * Process a single chunk of artworks: download images, generate JSONL, submit to Gemini
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const {
      artworks,
      chunkIndex,
      includeImages = true,
    }: ArtworkChunkProcessRequest = await request.json();

    if (!artworks || !Array.isArray(artworks) || artworks.length === 0) {
      return NextResponse.json({ error: "Invalid artworks data" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    logger.info("ARTWORK_PIPELINE_CHUNK", `Processing artwork chunk ${chunkIndex + 1}`, {
      chunkIndex,
      artworkCount: artworks.length,
      includeImages,
    });

    const geminiService = new GeminiService(apiKey);

    // Step 1: Generate batch requests (downloads images if includeImages=true)
    logger.info(
      "ARTWORK_PIPELINE_CHUNK",
      `Chunk ${chunkIndex + 1}: Generating artwork batch requests...`,
      { chunkIndex }
    );

    const batchRequests = await geminiService.createArtworkBatchRequests(
      artworks,
      includeImages,
      (processed, total) => {
        if (processed % 10 === 0) {
          logger.debug(
            "ARTWORK_PIPELINE_CHUNK",
            `Chunk ${chunkIndex + 1}: ${processed}/${total} artworks processed`,
            {
              chunkIndex,
              processed,
              total,
            }
          );
        }
      }
    );

    if (batchRequests.length === 0) {
      throw new Error("No batch requests generated");
    }

    // Step 2: Generate JSONL content
    const jsonlContent = geminiService.generateArtworkJSONL(batchRequests);

    // Extract SKU mapping for later use when saving images
    const skuMapping = artworks.map((artwork, idx) => ({
      index: idx,
      sku: artwork.sku || `idx-${idx}`,
      key: artwork.sku ? `artwork-${artwork.sku}` : `artwork-idx-${idx}`,
      aspectRatio: artwork.aspectRatio,
    }));

    logger.info(
      "ARTWORK_PIPELINE_CHUNK",
      `Chunk ${chunkIndex + 1}: Generated ${batchRequests.length} batch requests`,
      {
        chunkIndex,
        requestCount: batchRequests.length,
        jsonlSize: jsonlContent.length,
      }
    );

    // Step 3: Submit to Gemini Batch API
    logger.info(
      "ARTWORK_PIPELINE_CHUNK",
      `Chunk ${chunkIndex + 1}: Submitting to Gemini Batch API...`,
      { chunkIndex }
    );

    const submitResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/files?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file: {
            displayName: `artwork-batch-chunk-${chunkIndex + 1}-${Date.now()}.jsonl`,
            mimeType: "application/jsonl",
          },
        }),
      }
    );

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      throw new Error(`Failed to create file: ${submitResponse.status} - ${errorText}`);
    }

    const fileMetadata = await submitResponse.json();
    const uploadUri = fileMetadata.file?.uploadUri;

    if (!uploadUri) {
      throw new Error("No upload URI received from Files API");
    }

    // Upload the JSONL content
    const uploadResponse = await fetch(uploadUri, {
      method: "PUT",
      headers: {
        "Content-Type": "application/jsonl",
      },
      body: jsonlContent,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Failed to upload file: ${uploadResponse.status} - ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    const fileUri = uploadResult.file?.uri;

    if (!fileUri) {
      throw new Error("No file URI received after upload");
    }

    // Submit batch job
    const batchResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:batchGenerateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: {
            fileUri: fileUri,
          },
        }),
      }
    );

    if (!batchResponse.ok) {
      const errorText = await batchResponse.text();
      throw new Error(`Failed to submit batch: ${batchResponse.status} - ${errorText}`);
    }

    const batchResult = await batchResponse.json();
    const batchId = batchResult.name;

    const duration = Date.now() - startTime;
    logger.info(
      "ARTWORK_PIPELINE_CHUNK",
      `Chunk ${chunkIndex + 1}: Successfully submitted to Gemini`,
      {
        chunkIndex,
        batchId,
        duration,
        artworkCount: artworks.length,
      }
    );

    return NextResponse.json({
      success: true,
      chunkIndex,
      batchId,
      requestCount: batchRequests.length,
      skuMapping,
      duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    logger.error(
      "ARTWORK_PIPELINE_CHUNK",
      `Error processing artwork chunk`,
      error instanceof Error ? error : new Error(errorMessage),
      { duration }
    );

    return NextResponse.json(
      { error: errorMessage, duration },
      { status: 500 }
    );
  }
}
