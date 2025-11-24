import { NextRequest, NextResponse } from 'next/server';
import { parseCSVFromBuffer, createChunkedCSVFiles } from '@/lib/csv-processor';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const requestId = `chunk-${Date.now()}`;
  const startTime = Date.now();
  
  try {
    logger.info('API_CHUNK_CSV', 'Chunk CSV request received', { requestId });
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const chunkSize = parseInt(formData.get('chunkSize') as string) || 150;
    
    if (!file) {
      logger.warn('API_CHUNK_CSV', 'No file provided in request', { requestId });
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    logger.info('API_CHUNK_CSV', 'Processing file', { 
      requestId,
      fileName: file.name,
      fileSize: file.size,
      chunkSize
    });

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Parse CSV
    const csvData = await parseCSVFromBuffer(buffer);
    logger.info('API_CHUNK_CSV', `Parsed CSV with ${csvData.length} rows`, { 
      requestId,
      rowCount: csvData.length 
    });
    
    // Create chunked files
    const chunkedFiles = createChunkedCSVFiles(csvData, chunkSize);
    
    const duration = Date.now() - startTime;
    logger.info('API_CHUNK_CSV', 'Chunking completed successfully', {
      requestId,
      totalRows: csvData.length,
      totalChunks: chunkedFiles.length,
      chunkSize,
      duration,
      avgTimePerRow: csvData.length > 0 ? duration / csvData.length : 0
    });
    
    // Return the chunked files metadata
    return NextResponse.json({
      success: true,
      totalRows: csvData.length,
      totalChunks: chunkedFiles.length,
      chunkSize,
      files: chunkedFiles.map(f => ({
        filename: f.filename,
        size: f.content.length
      }))
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('API_CHUNK_CSV', 'Failed to process CSV file', error as Error, {
      requestId,
      duration
    });
    
    return NextResponse.json(
      { error: 'Failed to process CSV file' },
      { status: 500 }
    );
  }
}
