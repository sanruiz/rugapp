import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile, stat } from 'fs/promises';
import path from 'path';
import archiver from 'archiver';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFolder = searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    const imagesDir = path.join(process.cwd(), 'output', dateFolder, 'images');
    
    // Check if directory exists
    try {
      await stat(imagesDir);
    } catch {
      return NextResponse.json(
        { error: `No images found for date: ${dateFolder}` },
        { status: 404 }
      );
    }

    // Get all image files
    const files = await readdir(imagesDir);
    const imageFiles = files.filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f));
    
    if (imageFiles.length === 0) {
      return NextResponse.json(
        { error: 'No images found in the directory' },
        { status: 404 }
      );
    }

    // Create a zip archive
    const archive = archiver('zip', {
      zlib: { level: 5 } // Compression level (0-9)
    });

    // Collect chunks in memory
    const chunks: Buffer[] = [];
    
    archive.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    // Add all images to the archive
    for (const filename of imageFiles) {
      const filePath = path.join(imagesDir, filename);
      const fileBuffer = await readFile(filePath);
      archive.append(fileBuffer, { name: filename });
    }

    // Finalize the archive
    await archive.finalize();

    // Wait for all data to be collected
    await new Promise<void>((resolve, reject) => {
      archive.on('end', resolve);
      archive.on('error', reject);
    });

    // Combine all chunks into a single buffer
    const zipBuffer = Buffer.concat(chunks);

    // Return the zip file
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="rug-images-${dateFolder}.zip"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error creating zip file:', error);
    return NextResponse.json(
      { error: `Failed to create zip file: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

// Also support listing available dates
export async function POST() {
  try {
    const outputDir = path.join(process.cwd(), 'output');
    
    try {
      await stat(outputDir);
    } catch {
      return NextResponse.json({ dates: [] });
    }

    const folders = await readdir(outputDir);
    const dates: Array<{ date: string; imageCount: number }> = [];

    for (const folder of folders) {
      // Check if it looks like a date folder (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(folder)) {
        const imagesDir = path.join(outputDir, folder, 'images');
        try {
          const files = await readdir(imagesDir);
          const imageCount = files.filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f)).length;
          if (imageCount > 0) {
            dates.push({ date: folder, imageCount });
          }
        } catch {
          // No images directory
        }
      }
    }

    // Sort by date descending
    dates.sort((a, b) => b.date.localeCompare(a.date));

    return NextResponse.json({ dates });
  } catch (error) {
    console.error('Error listing dates:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
