import { NextRequest, NextResponse } from 'next/server';

/**
 * Generate images from the batch results using Google Imagen or another image generation service
 */
export async function POST(request: NextRequest) {
  try {
    const { prompts } = await request.json();
    
    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      return NextResponse.json({ error: 'Prompts array is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const results = [];

    // Process each prompt to generate an image
    for (const promptData of prompts) {
      try {
        // Extract the IMAGE GENERATION PROMPT from the Gemini response
        const promptText = promptData.prompt;
        const rugKey = promptData.key;

        // Google Imagen 3 API endpoint
        const imageResponse = await fetch(
          `https://us-central1-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              instances: [
                {
                  prompt: promptText
                }
              ],
              parameters: {
                sampleCount: 1,
                aspectRatio: "16:9", // Good for room scenes
                negativePrompt: "blurry, distorted, unrealistic, cartoon, low quality",
                guidanceScale: 15, // Higher = more adherence to prompt
              }
            })
          }
        );

        if (!imageResponse.ok) {
          const errorText = await imageResponse.text();
          console.error(`Failed to generate image for ${rugKey}:`, errorText);
          results.push({
            key: rugKey,
            success: false,
            error: 'Image generation failed'
          });
          continue;
        }

        const imageData = await imageResponse.json();
        
        // The response contains base64 encoded images
        const imageBase64 = imageData.predictions?.[0]?.bytesBase64Encoded;

        results.push({
          key: rugKey,
          success: true,
          imageUrl: `data:image/png;base64,${imageBase64}`,
          imageBase64
        });

      } catch (error) {
        console.error(`Error generating image for prompt:`, error);
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
