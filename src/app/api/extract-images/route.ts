import { NextRequest, NextResponse } from 'next/server';

/**
 * Extract images directly from batch results
 * gemini-2.5-flash-image in batch mode generates images when given image+prompt
 */
export async function POST(request: NextRequest) {
  try {
    const { batchResults } = await request.json();
    
    if (!batchResults) {
      return NextResponse.json({ error: 'Batch results required' }, { status: 400 });
    }

    const images = [];
    
    // Parse each line of the JSONL
    const lines = batchResults.split('\n').filter((line: string) => line.trim());
    
    console.log(`Extracting images from ${lines.length} batch results...`);
    
    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        const key = data.key; // e.g., "rug-26171"
        
        // Check for errors in batch response
        if (data.error) {
          console.error(`Batch error for ${key}:`, data.error);
          continue;
        }
        
        // Extract the generated image from the response
        const candidate = data.response?.candidates?.[0];
        if (!candidate) {
          console.warn(`No candidate found for ${key}`);
          continue;
        }
        
        const parts = candidate.content?.parts || [];
        let imageBase64 = '';
        let mimeType = 'image/png';
        let textDescription = '';
        
        // Look for inline_data (image) in the response parts
        for (const part of parts) {
          if (part.inline_data || part.inlineData) {
            const inlineData = part.inline_data || part.inlineData;
            imageBase64 = inlineData.data;
            mimeType = inlineData.mime_type || inlineData.mimeType || 'image/png';
          } else if (part.text) {
            textDescription += part.text;
          }
        }
        
        if (imageBase64) {
          images.push({
            key,
            imageUrl: `data:${mimeType};base64,${imageBase64}`,
            imageBase64,
            mimeType,
            description: textDescription || 'Generated room scene with rug'
          });
          console.log(`✓ Extracted image for ${key}`);
        } else {
          console.warn(`No image data found for ${key} - response may be text only`);
          if (textDescription) {
            console.log(`Text response: ${textDescription.substring(0, 100)}...`);
          }
        }
        
      } catch (err) {
        console.error('Error processing line:', err);
        continue;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Extracted ${images.length} images from ${lines.length} results`,
      data: images
    });
    
  } catch (error) {
    console.error('Error extracting images:', error);
    return NextResponse.json(
      { error: 'Failed to extract images from batch results' },
      { status: 500 }
    );
  }
}
