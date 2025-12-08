import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { content, chunkIndex, type } = await request.json();

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'No content provided' },
        { status: 400 }
      );
    }

    // Create output directory
    const outputDir = path.join(process.cwd(), 'output', 'results');
    await mkdir(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = type === 'jsonl' 
      ? `batch-results-chunk-${chunkIndex + 1}-${timestamp}.jsonl`
      : `batch-results-${timestamp}.jsonl`;
    
    const filePath = path.join(outputDir, filename);
    
    await writeFile(filePath, content, 'utf-8');

    console.log(`[SAVE] Results saved to: ${filePath}`);

    return NextResponse.json({
      success: true,
      data: {
        filePath,
        filename,
        size: content.length
      }
    });

  } catch (error) {
    console.error('Error saving results:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
