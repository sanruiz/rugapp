# Image-to-Image Generation Workflow

## What This Does
Sends the **original rug image + prompt** to Gemini 2.5 Flash Image via Batch API, and receives **NEW images** showing the rug placed in beautifully styled room scenes.

## How It Works

### 1. Input (gemini-service.ts)
For each rug, we create a batch request with:
- **Rug image** (as base64 inline_data)
- **Text prompt** asking Gemini to generate a new image with:
  - The exact rug from the provided image
  - Placed in a styled room (living room, hallway, etc.)
  - Appropriate furniture and decor
  - Professional lighting and composition
  - Photorealistic quality

### 2. Batch Processing (submit-batch/route.ts)
- Uploads JSONL file with all rug requests to Files API
- Submits to `gemini-2.5-flash-image:batchGenerateContent`
- Model: `gemini-2.5-flash-image` (supports image-to-image transformation)
- Each request: `[image, text_prompt] → new_image`

### 3. Output (extract-images/route.ts)
- Downloads batch results JSONL
- Extracts generated images from `inline_data` in response
- Each result contains the new styled room scene image
- Images are returned as base64 data URLs for display

## Key Differences from Previous Approach

### ❌ Previous (Wrong)
- Asked Gemini to generate **text descriptions** of room scenes
- Then tried to convert descriptions to images with second API call
- Slow, expensive, two-step process

### ✅ Current (Correct)
- Send **rug image + prompt** in one batch request
- Gemini generates **new image** directly showing rug in styled room
- Fast, efficient, single-step image transformation
- Uses Batch API 50% discount

## Request Format

```json
{
  "key": "rug-12345",
  "request": {
    "contents": [{
      "parts": [
        {
          "text": "Generate a photorealistic interior scene image featuring this exact rug..."
        },
        {
          "inline_data": {
            "mime_type": "image/jpeg",
            "data": "base64_encoded_rug_image_here"
          }
        }
      ]
    }],
    "generation_config": {
      "temperature": 0.7,
      "max_output_tokens": 8192
    }
  }
}
```

## Response Format

```json
{
  "key": "rug-12345",
  "response": {
    "candidates": [{
      "content": {
        "parts": [
          {
            "inline_data": {
              "mime_type": "image/png",
              "data": "base64_encoded_generated_room_scene_here"
            }
          }
        ]
      }
    }]
  }
}
```

## Cost Estimate
- Input: Rug image (~200KB) + prompt (~500 tokens) ≈ 1,000 tokens
- Output: Generated image (1024x1024) ≈ 2,000 tokens
- Total per rug: ~3,000 tokens with 50% batch discount
- **Cost: ~$0.0015 per rug with generated room scene**

## Testing
1. Upload CSV with rug data
2. Click "Generate Batch Requests with Images"
3. Submit batch to Gemini
4. Wait for completion (~30-60 seconds)
5. Click "Download & Extract Images"
6. View generated room scenes in the image grid

## Expected Results
Each rug should have a new AI-generated image showing:
- The original rug as the focal point
- Styled room with matching furniture
- Professional interior photography look
- Natural lighting and realistic textures
- 1024x1024px resolution
