import { NextRequest, NextResponse } from 'next/server';
import archiver from 'archiver';

interface ImageData {
  key: string;
  imageUrl: string; // data:image/png;base64,... or regular URL
}

export async function POST(request: NextRequest) {
  try {
    const { images } = await request.json() as { images: ImageData[] };

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: 'No images provided' },
        { status: 400 }
      );
    }

    console.log(`[ZIP-IMAGES] Creating ZIP for ${images.length} images`);

    // Create a zip archive using a Promise-based approach
    const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
      const archive = archiver('zip', {
        zlib: { level: 5 }
      });

      const chunks: Buffer[] = [];

      archive.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      archive.on('end', () => {
        console.log(`[ZIP-IMAGES] Archive complete, size: ${chunks.reduce((a, b) => a + b.length, 0)} bytes`);
        resolve(Buffer.concat(chunks));
      });

      archive.on('error', (err) => {
        console.error(`[ZIP-IMAGES] Archive error:`, err);
        reject(err);
      });

      // Add all images to archive
      (async () => {
        try {
          for (const image of images) {
            let buffer: Buffer;
            let extension = 'png';

            if (image.imageUrl.startsWith('data:')) {
              // Parse data URL
              const matches = image.imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
              if (matches) {
                extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                buffer = Buffer.from(matches[2], 'base64');
              } else {
                console.warn(`[ZIP-IMAGES] Invalid data URL for ${image.key}`);
                continue;
              }
            } else {
              // Fetch from URL
              try {
                const response = await fetch(image.imageUrl);
                if (!response.ok) {
                  console.warn(`[ZIP-IMAGES] Failed to fetch ${image.key}: ${response.status}`);
                  continue;
                }
                const arrayBuffer = await response.arrayBuffer();
                buffer = Buffer.from(arrayBuffer);
                
                // Determine extension from content type
                const contentType = response.headers.get('content-type');
                if (contentType?.includes('jpeg')) extension = 'jpg';
                else if (contentType?.includes('webp')) extension = 'webp';
              } catch (fetchError) {
                console.warn(`[ZIP-IMAGES] Error fetching ${image.key}:`, fetchError);
                continue;
              }
            }

            const filename = `${image.key}.${extension}`;
            archive.append(buffer, { name: filename });
            console.log(`[ZIP-IMAGES] Added ${filename} (${buffer.length} bytes)`);
          }
          
          await archive.finalize();
        } catch (err) {
          reject(err);
        }
      })();
    });

    console.log(`[ZIP-IMAGES] Sending ZIP file, size: ${zipBuffer.length} bytes`);

    const dateStr = new Date().toISOString().split('T')[0];

    // Return the zip file - convert Buffer to Uint8Array for NextResponse compatibility
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="rug-images-${dateStr}.zip"`,
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
