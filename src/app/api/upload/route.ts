import { NextRequest, NextResponse } from 'next/server';
import { parseCSVFromBuffer, processRugsFromCSV } from '@/lib/csv-processor';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Parse CSV
    const csvData = await parseCSVFromBuffer(buffer);
    
    if (csvData.length === 0) {
      return NextResponse.json({ error: 'CSV file is empty' }, { status: 400 });
    }

    // Process rugs
    const processedRugs = processRugsFromCSV(csvData);

    // Return processed data
    return NextResponse.json({
      success: true,
      message: `Successfully processed ${processedRugs.length} rugs`,
      data: {
        totalRugs: processedRugs.length,
        rugs: processedRugs, // Return ALL rugs for batch processing
        preview: processedRugs.slice(0, 5), // First 5 for UI preview
        hasMore: processedRugs.length > 5,
      },
    });

  } catch (error) {
    console.error('Error processing CSV:', error);
    return NextResponse.json(
      { error: 'Failed to process CSV file' },
      { status: 500 }
    );
  }
}
