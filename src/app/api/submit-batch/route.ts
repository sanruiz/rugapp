import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { jsonlContent, displayName } = await request.json();
    
    if (!jsonlContent) {
      return NextResponse.json({ error: 'JSONL content is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    // Step 1: Upload the JSONL file using Files API
    const uploadResponse = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'multipart',
      },
      body: createMultipartBody(jsonlContent, displayName || 'batch-requests')
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('File upload failed:', errorText);
      return NextResponse.json({ 
        error: 'Failed to upload file to Gemini API',
        details: errorText
      }, { status: 500 });
    }

    const uploadResult = await uploadResponse.json();
    console.log('File uploaded:', uploadResult);

    // Step 2: Create batch job using the correct batchGenerateContent API format
    // According to the REST API docs, the request body uses snake_case:
    // { batch: { display_name, input_config: { file_name } } }
    const requestBody = {
      batch: {
        display_name: displayName || 'Rug Processing Batch',
        input_config: {
          file_name: uploadResult.file.name
        }
      }
    };

    console.log('Attempting batch creation:', JSON.stringify(requestBody, null, 2));

    // Use gemini-2.5-flash-image for image-to-image generation
    // Sends rug image + prompt, receives new image with rug in styled room
    const batchEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:batchGenerateContent?key=${apiKey}`;
    
    const batchResponse = await fetch(batchEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!batchResponse.ok) {
      const errorText = await batchResponse.text();
      console.error('Batch creation failed:', {
        status: batchResponse.status,
        statusText: batchResponse.statusText,
        error: errorText,
        requestBody: JSON.stringify(requestBody, null, 2),
        endpoint: batchEndpoint
      });
      
      return NextResponse.json({ 
        error: 'Failed to create batch job',
        details: errorText,
        status: batchResponse.status,
        requestSent: requestBody
      }, { status: 500 });
    }

    const batchResult = await batchResponse.json();
    console.log('Batch created successfully:', JSON.stringify(batchResult, null, 2));
    
    // The response is an Operation object with metadata containing the batch info
    // Extract batch information from the response
    const batchName = batchResult.name || '';
    const metadata = batchResult.metadata || {};
    
    return NextResponse.json({
      success: true,
      message: 'Batch job created successfully',
      data: {
        batchId: batchName,
        fileName: uploadResult.file.name,
        displayName: metadata.displayName || displayName,
        state: metadata.state || 'JOB_STATE_PENDING',
        createTime: metadata.createTime || new Date().toISOString(),
        model: metadata.model || 'gemini-2.5-flash',
        requestCount: metadata.requestCount || 0,
        completedCount: 0
      }
    });

  } catch (error) {
    console.error('Error submitting batch:', error);
    return NextResponse.json(
      { error: 'Failed to submit batch request' },
      { status: 500 }
    );
  }
}

function createMultipartBody(jsonlContent: string, displayName: string): FormData {
  const formData = new FormData();
  
  // Create metadata
  const metadata = {
    file: {
      display_name: displayName,
      mime_type: 'application/jsonl'
    }
  };
  
  // Add metadata and file content
  formData.append('metadata', JSON.stringify(metadata));
  formData.append('data', new Blob([jsonlContent], { type: 'application/jsonl' }));
  
  return formData;
}
