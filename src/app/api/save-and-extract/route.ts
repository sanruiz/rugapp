import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

interface SkuMapping {
  index: number;
  sku: string;
  key: string;
}

interface BatchResult {
  key?: string;
  response?: {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
          inlineData?: {
            mimeType: string;
            data: string;
          };
        }>;
      };
    }>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { jsonlContent, chunkIndex, skuMapping } = await request.json() as {
      jsonlContent: string;
      chunkIndex: number;
      skuMapping?: SkuMapping[];
    };

    if (!jsonlContent) {
      return NextResponse.json(
        { success: false, error: 'No JSONL content provided' },
        { status: 400 }
      );
    }

    // Create output directories
    const timestamp = new Date().toISOString().split('T')[0];
    const baseDir = path.join(process.cwd(), 'output', timestamp);
    const jsonlDir = path.join(baseDir, 'jsonl');
    const imagesDir = path.join(baseDir, 'images');
    
    await mkdir(jsonlDir, { recursive: true });
    await mkdir(imagesDir, { recursive: true });

    // Save JSONL file
    const jsonlFilename = `batch-results-chunk-${chunkIndex + 1}.jsonl`;
    const jsonlPath = path.join(jsonlDir, jsonlFilename);
    await writeFile(jsonlPath, jsonlContent, 'utf-8');
    console.log(`[SAVE] JSONL saved: ${jsonlPath}`);

    // Parse and extract images
    const lines = jsonlContent.trim().split('\n');
    const extractedImages: Array<{ key: string; filename: string; size: number }> = [];
    const errors: string[] = [];

    // Debug: Log SKU mapping info
    console.log(`[SAVE] Chunk ${chunkIndex + 1}: SKU mapping received:`, skuMapping ? `${skuMapping.length} entries` : 'NONE');
    if (skuMapping && skuMapping.length > 0) {
      console.log(`[SAVE] SKU mapping sample:`, skuMapping.slice(0, 3));
    }

    for (let i = 0; i < lines.length; i++) {
      try {
        const result: BatchResult = JSON.parse(lines[i]);
        
        // Use SKU mapping if available, otherwise fallback to index
        let imageKey: string;
        if (skuMapping && skuMapping[i]) {
          // SKU might be "idx-X" if original rug had no SKU
          const sku = skuMapping[i].sku;
          imageKey = sku.startsWith('idx-') ? `rug-${sku}` : `rug-${sku}`;
          console.log(`[SAVE] Line ${i}: Using SKU mapping -> ${imageKey}`);
        } else if (result.key) {
          imageKey = result.key;
          console.log(`[SAVE] Line ${i}: Using result.key -> ${imageKey}`);
        } else {
          imageKey = `rug-idx-${chunkIndex * 100 + i}`;
          console.log(`[SAVE] Line ${i}: Using fallback -> ${imageKey}`);
        }
        
        // Find image data in response
        const candidates = result.response?.candidates;
        if (!candidates || candidates.length === 0) {
          errors.push(`${imageKey}: No candidates in response`);
          continue;
        }

        const parts = candidates[0]?.content?.parts;
        if (!parts) {
          errors.push(`${imageKey}: No parts in response`);
          continue;
        }

        // Look for inline image data
        const imagePart = parts.find(part => part.inlineData?.data);
        
        if (imagePart?.inlineData) {
          const { mimeType, data } = imagePart.inlineData;
          const extension = mimeType === 'image/png' ? 'png' : 'jpg';
          const imageFilename = `${imageKey}.${extension}`;
          const imagePath = path.join(imagesDir, imageFilename);
          
          // Convert base64 to buffer and save
          const imageBuffer = Buffer.from(data, 'base64');
          await writeFile(imagePath, imageBuffer);
          
          extractedImages.push({
            key: imageKey,
            filename: imageFilename,
            size: imageBuffer.length
          });
          
          console.log(`[SAVE] Image saved: ${imageFilename} (${(imageBuffer.length / 1024).toFixed(1)} KB)`);
        } else {
          const textPart = parts.find(part => part.text);
          if (textPart) {
            errors.push(`${imageKey}: Text-only response`);
          } else {
            errors.push(`${imageKey}: No image data found`);
          }
        }
      } catch (parseError) {
        errors.push(`Line ${i + 1}: Parse error - ${(parseError as Error).message}`);
      }
    }

    console.log(`[SAVE] Chunk ${chunkIndex + 1}: ${extractedImages.length} images, ${errors.length} errors`);

    return NextResponse.json({
      success: true,
      data: {
        jsonlPath,
        imagesDir,
        totalResults: lines.length,
        extractedImages: extractedImages.length,
        images: extractedImages,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('Error saving and extracting:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
