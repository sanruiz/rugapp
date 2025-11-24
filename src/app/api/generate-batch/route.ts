import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/lib/gemini-service';
import { ProcessedRug } from '@/types/rug';

export async function POST(request: NextRequest) {
  try {
    const { rugs, includeImages = false } = await request.json();
    
    if (!rugs || !Array.isArray(rugs) || rugs.length === 0) {
      return NextResponse.json({ error: 'Invalid rugs data' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const geminiService = new GeminiService(apiKey);
    const processedRugs: ProcessedRug[] = rugs;

    // Generate batch requests
    const batchRequests = await geminiService.createBatchRequests(
      processedRugs,
      includeImages
    );

    // Generate JSONL content
    const jsonlContent = geminiService.generateJSONL(batchRequests);

    return NextResponse.json({
      success: true,
      message: `Generated ${batchRequests.length} batch requests`,
      data: {
        totalRequests: batchRequests.length,
        jsonlContent,
        batchRequests: batchRequests.slice(0, 3) // Return first 3 for preview
      }
    });

  } catch (error) {
    console.error('Error generating batch requests:', error);
    return NextResponse.json(
      { error: 'Failed to generate batch requests' },
      { status: 500 }
    );
  }
}
