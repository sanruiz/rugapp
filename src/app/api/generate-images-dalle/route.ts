import { NextRequest, NextResponse } from 'next/server';

/**
 * Generate images using OpenAI's DALL-E 3
 * This is simpler to set up than Google Imagen
 */
export async function POST(request: NextRequest) {
  try {
    const { prompts } = await request.json();
    
    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      return NextResponse.json({ error: 'Prompts array is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured. Add OPENAI_API_KEY to your .env file' 
      }, { status: 500 });
    }

    const results = [];

    // Process each prompt to generate an image
    // Note: DALL-E 3 has rate limits, so you may want to add delays between requests
    for (const promptData of prompts) {
      try {
        const promptText = promptData.prompt;
        const rugKey = promptData.key;

        console.log(`Generating image for ${rugKey}...`);

        // DALL-E 3 API call
        const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: promptText,
            n: 1,
            size: "1792x1024", // Wide format for room scenes
            quality: "hd",
            style: "natural" // More photorealistic
          })
        });

        if (!imageResponse.ok) {
          const errorText = await imageResponse.text();
          console.error(`Failed to generate image for ${rugKey}:`, errorText);
          results.push({
            key: rugKey,
            success: false,
            error: `DALL-E API error: ${errorText}`
          });
          continue;
        }

        const imageData = await imageResponse.json();
        const imageUrl = imageData.data?.[0]?.url;
        const revisedPrompt = imageData.data?.[0]?.revised_prompt;

        if (!imageUrl) {
          results.push({
            key: rugKey,
            success: false,
            error: 'No image URL returned'
          });
          continue;
        }

        results.push({
          key: rugKey,
          success: true,
          imageUrl,
          revisedPrompt // DALL-E 3 sometimes revises prompts
        });

        console.log(`✓ Generated image for ${rugKey}`);

        // Add a small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error generating image:`, error);
        results.push({
          key: promptData.key,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${results.filter(r => r.success).length}/${prompts.length} images`,
      data: results
    });

  } catch (error) {
    console.error('Error in image generation:', error);
    return NextResponse.json(
      { error: 'Failed to generate images' },
      { status: 500 }
    );
  }
}
