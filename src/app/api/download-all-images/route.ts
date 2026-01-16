import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile, stat } from 'fs/promises';
import path from 'path';
import archiver from 'archiver';

// Find the most recent date folder with images
async function findLatestImagesFolder(): Promise<{ dateFolder: string; imagesDir: string } | null> {
  const outputDir = path.join(process.cwd(), 'output');
  
  try {
    await stat(outputDir);
  } catch {
    return null;
  }

  const folders = await readdir(outputDir);
  
  // Filter date folders and sort descending
  const dateFolders = folders
    .filter(f => /^\d{4}-\d{2}-\d{2}$/.test(f))
    .sort((a, b) => b.localeCompare(a));

  for (const dateFolder of dateFolders) {
    const imagesDir = path.join(outputDir, dateFolder, 'images');
    try {
      await stat(imagesDir);
      const files = await readdir(imagesDir);
      const hasImages = files.some(f => /\.(png|jpg|jpeg|webp)$/i.test(f));
      if (hasImages) {
        return { dateFolder, imagesDir };
      }
    } catch {
      // No images dir, continue
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let dateFolder = searchParams.get("date");
    let imagesDir: string;

    if (dateFolder) {
      imagesDir = path.join(process.cwd(), "output", dateFolder, "images");

      // Check if specified directory exists
      try {
        await stat(imagesDir);
      } catch {
        // If specified date not found, try to find the latest
        console.log(
          `[DOWNLOAD-ALL] Date ${dateFolder} not found, looking for latest...`
        );
        const latest = await findLatestImagesFolder();
        if (latest) {
          dateFolder = latest.dateFolder;
          imagesDir = latest.imagesDir;
          console.log(`[DOWNLOAD-ALL] Using latest folder: ${dateFolder}`);
        } else {
          return NextResponse.json(
            { error: `No images found for date: ${dateFolder}` },
            { status: 404 }
          );
        }
      }
    } else {
      // No date specified, find latest
      const latest = await findLatestImagesFolder();
      if (latest) {
        dateFolder = latest.dateFolder;
        imagesDir = latest.imagesDir;
      } else {
        return NextResponse.json(
          { error: "No images found in any folder" },
          { status: 404 }
        );
      }
    }

    console.log(`[DOWNLOAD-ALL] Looking for images in: ${imagesDir}`);

    // Get all image files
    const files = await readdir(imagesDir);
    const imageFiles = files.filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f));

    console.log(`[DOWNLOAD-ALL] Found ${imageFiles.length} images`);

    if (imageFiles.length === 0) {
      return NextResponse.json(
        { error: "No images found in the directory" },
        { status: 404 }
      );
    }

    // Create a zip archive using a Promise-based approach
    const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
      const archive = archiver("zip", {
        zlib: { level: 5 },
      });

      const chunks: Buffer[] = [];

      archive.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      archive.on("end", () => {
        console.log(
          `[DOWNLOAD-ALL] Archive complete, size: ${chunks.reduce(
            (a, b) => a + b.length,
            0
          )} bytes`
        );
        resolve(Buffer.concat(chunks));
      });

      archive.on("error", (err) => {
        console.error(`[DOWNLOAD-ALL] Archive error:`, err);
        reject(err);
      });

      // Add all files to archive
      (async () => {
        try {
          for (const filename of imageFiles) {
            const filePath = path.join(imagesDir, filename);
            const fileBuffer = await readFile(filePath);
            archive.append(fileBuffer, { name: filename });
          }
          await archive.finalize();
        } catch (err) {
          reject(err);
        }
      })();
    });

    console.log(
      `[DOWNLOAD-ALL] Sending ZIP file, size: ${zipBuffer.length} bytes`
    );

    // Return the zip file - convert Buffer to Uint8Array for NextResponse compatibility
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="rug-images-${dateFolder}.zip"`,
        "Content-Length": zipBuffer.length.toString(),
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
