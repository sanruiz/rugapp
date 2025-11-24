import { NextRequest, NextResponse } from 'next/server';
import { parseCSVFromBuffer, createChunkedCSVFiles } from '@/lib/csv-processor';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const requestId = `download-${Date.now()}`;
  const startTime = Date.now();
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const chunkSize = parseInt(formData.get('chunkSize') as string) || 150;
    
    logger.info('API_DOWNLOAD_CHUNK', 'Chunk download request', { 
      requestId, 
      chunkIndex, 
      chunkSize,
      fileName: file?.name 
    });
    
    if (!file) {
      logger.warn('API_DOWNLOAD_CHUNK', 'No file provided', { requestId });
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (isNaN(chunkIndex)) {
      logger.warn('API_DOWNLOAD_CHUNK', 'Invalid chunk index', { requestId, chunkIndex });
      return NextResponse.json({ error: 'Invalid chunk index' }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Parse CSV
    const csvData = await parseCSVFromBuffer(buffer);
    
    // Create chunked files
    const chunkedFiles = createChunkedCSVFiles(csvData, chunkSize);
    
    if (chunkIndex >= chunkedFiles.length || chunkIndex < 0) {
      logger.warn('API_DOWNLOAD_CHUNK', 'Chunk index out of range', { 
        requestId, 
        chunkIndex, 
        totalChunks: chunkedFiles.length 
      });
      return NextResponse.json({ error: 'Chunk index out of range' }, { status: 400 });
    }
    
    const requestedChunk = chunkedFiles[chunkIndex];
    const duration = Date.now() - startTime;
    
    logger.logChunkOperation(chunkIndex, 'DOWNLOAD', true, {
      requestId,
      filename: requestedChunk.filename,
      fileSize: requestedChunk.content.length,
      duration
    });
    
    // Return the specific chunk as a downloadable CSV
    return new NextResponse(requestedChunk.content, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${requestedChunk.filename}"`,
      },
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('API_DOWNLOAD_CHUNK', 'Failed to download chunk', error as Error, {
      requestId,
      duration
    });
    
    return NextResponse.json(
      { error: 'Failed to download chunk' },
      { status: 500 }
    );
  }
}
