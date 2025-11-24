import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    
    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    // Clean batch ID - remove "batches/" prefix if present
    const cleanBatchId = batchId.startsWith('batches/') ? batchId.substring(8) : batchId;
    
    // Get batch job status - correct Batch API endpoint
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/batches/${cleanBatchId}?key=${apiKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to get batch status:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        batchId
      });
      return NextResponse.json({ 
        error: 'Failed to get batch status',
        details: errorText,
        status: response.status
      }, { status: 500 });
    }

    const batchData = await response.json();
    console.log('Batch status raw response:', JSON.stringify(batchData, null, 2));
    
    // The API returns data in metadata object
    const metadata = batchData.metadata || {};
    const batchStats = metadata.batchStats || {};
    const output = metadata.output || batchData.response || {};
    
    // Parse state - convert BATCH_STATE_* to JOB_STATE_* for consistency
    let state = metadata.state || 'JOB_STATE_UNKNOWN';
    if (state.startsWith('BATCH_STATE_')) {
      state = state.replace('BATCH_STATE_', 'JOB_STATE_');
    }
    
    return NextResponse.json({
      success: true,
      data: {
        batchId: batchData.name || batchId,
        displayName: metadata.displayName || 'Batch Job',
        state: state,
        createTime: metadata.createTime,
        updateTime: metadata.updateTime,
        endTime: metadata.endTime,
        requestCount: parseInt(batchStats.requestCount || '0'),
        completedCount: parseInt(batchStats.successfulRequestCount || '0'),
        failedCount: parseInt(batchStats.failedRequestCount || '0'),
        outputFile: output.responsesFile || null,
        error: batchData.error,
        done: batchData.done || false
      }
    });

  } catch (error) {
    console.error('Error checking batch status:', error);
    return NextResponse.json(
      { error: 'Failed to check batch status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { batchId, action } = await request.json();
    
    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    let endpoint = '';
    let method = 'POST';

    // Clean batch ID - remove "batches/" prefix if present  
    const cleanBatchId = batchId.startsWith('batches/') ? batchId.substring(8) : batchId;
    
    switch (action) {
      case 'cancel':
        endpoint = `https://generativelanguage.googleapis.com/v1beta/batches/${cleanBatchId}:cancel?key=${apiKey}`;
        break;
      case 'delete':
        endpoint = `https://generativelanguage.googleapis.com/v1beta/batches/${cleanBatchId}?key=${apiKey}`;
        method = 'DELETE';
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const response = await fetch(endpoint, {
      method,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to ${action} batch:`, errorText);
      return NextResponse.json({ 
        error: `Failed to ${action} batch`,
        details: errorText
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Batch ${action}ed successfully`
    });

  } catch (error) {
    console.error('Error processing batch action:', error);
    return NextResponse.json(
      { error: 'Failed to process batch action' },
      { status: 500 }
    );
  }
}
