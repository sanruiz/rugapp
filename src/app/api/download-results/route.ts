import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    
    if (!fileName) {
      return NextResponse.json({ error: 'File name is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    // Download the results file using the special download endpoint
    // The fileName should be like "files/batch-xxxxx"
    // Use the download API with :download?alt=media
    const downloadUrl = `https://generativelanguage.googleapis.com/download/v1beta/${fileName}:download?alt=media&key=${apiKey}`;
    
    console.log('Downloading from:', downloadUrl);
    
    const response = await fetch(downloadUrl, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to download results:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        fileName,
        downloadUrl
      });
      return NextResponse.json({ 
        error: 'Failed to download results',
        details: errorText
      }, { status: 500 });
    }

    const fileContent = await response.text();
    console.log('Downloaded file content, size:', fileContent.length, 'bytes');
    
    return NextResponse.json({
      success: true,
      data: {
        fileName,
        content: fileContent,
        resultCount: fileContent.split('\n').filter(line => line.trim()).length
      }
    });

  } catch (error) {
    console.error('Error downloading results:', error);
    return NextResponse.json(
      { error: 'Failed to download results' },
      { status: 500 }
    );
  }
}
