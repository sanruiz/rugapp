import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/lib/gemini-service';
import { logger } from '@/lib/logger';
import { ProcessedRug } from '@/types/rug';

export const maxDuration = 300; // 5 minutes timeout for this endpoint

interface ChunkProcessRequest {
  rugs: ProcessedRug[];
  chunkIndex: number;
  includeImages: boolean;
}

/**
 * Process a single chunk: download images, generate JSONL, submit to Gemini
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { rugs, chunkIndex, includeImages = true }: ChunkProcessRequest = await request.json();
    
    if (!rugs || !Array.isArray(rugs) || rugs.length === 0) {
      return NextResponse.json({ error: 'Invalid rugs data' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    logger.info('PIPELINE_CHUNK', `Processing chunk ${chunkIndex + 1}`, {
      chunkIndex,
      rugCount: rugs.length,
      includeImages
    });

    const geminiService = new GeminiService(apiKey);

    // Step 1: Generate batch requests (downloads images if includeImages=true)
    logger.info('PIPELINE_CHUNK', `Chunk ${chunkIndex + 1}: Generating batch requests...`, { chunkIndex });
    
    const batchRequests = await geminiService.createBatchRequests(
      rugs,
      includeImages,
      (processed, total) => {
        // Progress callback - could be used for SSE in future
        if (processed % 10 === 0) {
          logger.debug('PIPELINE_CHUNK', `Chunk ${chunkIndex + 1}: ${processed}/${total} rugs processed`, {
            chunkIndex,
            processed,
            total
          });
        }
      }
    );

    if (batchRequests.length === 0) {
      throw new Error('No batch requests generated');
    }

    // Step 2: Generate JSONL content
    const jsonlContent = geminiService.generateJSONL(batchRequests);
    
    logger.info('PIPELINE_CHUNK', `Chunk ${chunkIndex + 1}: Generated ${batchRequests.length} batch requests`, {
      chunkIndex,
      requestCount: batchRequests.length,
      jsonlSize: jsonlContent.length
    });

    // Step 3: Submit to Gemini Batch API
    logger.info('PIPELINE_CHUNK', `Chunk ${chunkIndex + 1}: Submitting to Gemini...`, { chunkIndex });
    
    const submitResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/submit-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonlContent,
        displayName: `Rug Batch Chunk ${chunkIndex + 1} - ${new Date().toISOString().split('T')[0]}`
      })
    });

    const submitResult = await submitResponse.json();

    if (!submitResult.success) {
      throw new Error(submitResult.error || 'Failed to submit batch');
    }

    const duration = Date.now() - startTime;
    
    logger.info('PIPELINE_CHUNK', `Chunk ${chunkIndex + 1}: Successfully submitted`, {
      chunkIndex,
      batchId: submitResult.data.batchId,
      duration
    });

    return NextResponse.json({
      success: true,
      data: {
        chunkIndex,
        batchId: submitResult.data.batchId,
        batchJob: submitResult.data,
        requestCount: batchRequests.length,
        duration
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('PIPELINE_CHUNK', `Failed to process chunk`, error as Error, { duration });
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      duration
    }, { status: 500 });
  }
}
