import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readdir, stat } from 'fs/promises';
import path from 'path';

// Helper to find the most recent output folder
async function findLatestOutputFolder(): Promise<string | null> {
  const outputBase = path.join(process.cwd(), 'output');
  try {
    const folders = await readdir(outputBase);
    // Filter folders that look like dates (YYYY-MM-DD)
    const dateFolders = folders.filter(f => /^\d{4}-\d{2}-\d{2}$/.test(f));
    if (dateFolders.length === 0) return null;
    
    // Sort descending to get most recent
    dateFolders.sort((a, b) => b.localeCompare(a));
    
    // Verify the folder has content
    for (const folder of dateFolders) {
      const folderPath = path.join(outputBase, folder);
      const folderStat = await stat(folderPath);
      if (folderStat.isDirectory()) {
        return folder;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
  }

  // List ALL batches from Gemini and compare with local files
  if (action === 'list' || action === 'status') {
    try {
      // 1. Get all batches from Gemini (paginate to get all)
      const allOperations: Array<{
        name: string;
        metadata: {
          displayName?: string;
          state: string;
          batchStats?: { requestCount?: string; successfulRequestCount?: string };
          output?: { responsesFile?: string };
        };
        done?: boolean;
      }> = [];
      
      let nextPageToken: string | undefined;
      do {
        const listUrl = nextPageToken 
          ? `https://generativelanguage.googleapis.com/v1beta/batches?key=${apiKey}&pageToken=${nextPageToken}`
          : `https://generativelanguage.googleapis.com/v1beta/batches?key=${apiKey}`;
        
        console.log('Fetching batches from Gemini...');
        const response = await fetch(listUrl);
        const responseText = await response.text();
        
        if (!response.ok) {
          console.error('Gemini API error:', responseText);
          return NextResponse.json({ 
            error: 'Gemini API error', 
            status: response.status,
            details: responseText 
          }, { status: 500 });
        }
        
        let data;
        try {
          data = JSON.parse(responseText);
        } catch {
          console.error('Failed to parse response:', responseText.substring(0, 500));
          return NextResponse.json({ 
            error: 'Invalid JSON response from Gemini',
            preview: responseText.substring(0, 500)
          }, { status: 500 });
        }
        
        if (data.operations) {
          allOperations.push(...data.operations);
        }
        nextPageToken = data.nextPageToken;
      } while (nextPageToken);

      console.log(`Found ${allOperations.length} total batches in Gemini`);

      // 2. Get local JSONL files - use date from query param, or auto-detect latest folder
      const dateParam = searchParams.get('date');
      const outputDate = dateParam || await findLatestOutputFolder() || new Date().toISOString().split('T')[0];
      const jsonlDir = path.join(process.cwd(), 'output', outputDate, 'jsonl');
      let localChunks: number[] = [];
      
      console.log(`Looking for local chunks in: ${jsonlDir}`);
      
      try {
        const files = await readdir(jsonlDir);
        localChunks = files
          .filter(f => f.startsWith('batch-results-chunk-') && f.endsWith('.jsonl'))
          .map(f => parseInt(f.replace('batch-results-chunk-', '').replace('.jsonl', '')))
          .filter(n => !isNaN(n));
      } catch {
        // Directory doesn't exist yet
      }

      // 3. Analyze each batch (using the new structure from /v1beta/batches)
      const batchAnalysis = allOperations.map((operation) => {
        const metadata = operation.metadata;
        
        // Extract chunk number from displayName (e.g., "Rug Batch Chunk 14 - 2026-01-22")
        const chunkMatch = metadata.displayName?.match(/Chunk (\d+)/);
        const chunkNumber = chunkMatch ? parseInt(chunkMatch[1]) : null;
        
        // Extract batch ID from name (e.g., "batches/xxxxx")
        const batchId = operation.name;
        const shortId = batchId.replace('batches/', '');
        
        // State is BATCH_STATE_SUCCEEDED, BATCH_STATE_RUNNING, etc.
        const state = metadata.state;
        const isSucceeded = state === 'BATCH_STATE_SUCCEEDED';
        
        const successCount = parseInt(metadata.batchStats?.successfulRequestCount || '0');
        const totalCount = parseInt(metadata.batchStats?.requestCount || '0');
        
        return {
          batchId,
          shortId,
          displayName: metadata.displayName,
          chunkNumber,
          state,
          successCount,
          totalCount,
          outputFile: metadata.output?.responsesFile || `files/batch-${shortId}`,
          isDownloaded: chunkNumber ? localChunks.includes(chunkNumber) : false,
          needsDownload: isSucceeded && chunkNumber && !localChunks.includes(chunkNumber),
        };
      });

      // 4. Summary
      const succeeded = batchAnalysis.filter(b => b.state === 'BATCH_STATE_SUCCEEDED');
      const needsDownload = batchAnalysis.filter(b => b.needsDownload);
      const pending = batchAnalysis.filter(b => 
        b.state === 'BATCH_STATE_RUNNING' || b.state === 'BATCH_STATE_PENDING'
      );

      // 5. Find missing chunks (not in local AND not in Gemini)
      const geminiChunks = batchAnalysis
        .filter(b => b.chunkNumber !== null)
        .map(b => b.chunkNumber as number);
      
      // Determine max expected chunk from either local or Gemini
      const allKnownChunks = [...new Set([...localChunks, ...geminiChunks])];
      const maxChunk = allKnownChunks.length > 0 ? Math.max(...allKnownChunks) : 0;
      
      // Find gaps - chunks that are neither local nor in Gemini
      const missingChunks: number[] = [];
      for (let i = 1; i <= maxChunk; i++) {
        if (!localChunks.includes(i) && !geminiChunks.includes(i)) {
          missingChunks.push(i);
        }
      }

      return NextResponse.json({
        success: true,
        outputDate,
        summary: {
          totalBatches: allOperations.length,
          succeeded: succeeded.length,
          needsDownload: needsDownload.length,
          pending: pending.length,
          localChunks: localChunks.sort((a, b) => a - b),
          missingChunks, // Chunks that never made it to Gemini
          maxChunk,
        },
        needsDownload: needsDownload.sort((a: { chunkNumber: number | null }, b: { chunkNumber: number | null }) => 
          (a.chunkNumber || 0) - (b.chunkNumber || 0)
        ),
        pending,
        allBatches: batchAnalysis,
      });

    } catch (error) {
      console.error('Error listing batches:', error);
      return NextResponse.json({ error: String(error) }, { status: 500 });
    }
  }

  // Download a specific batch by batchId
  if (action === 'download') {
    const batchId = searchParams.get('batchId');
    const chunkNumber = searchParams.get('chunk');
    
    if (!batchId) {
      return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
    }

    try {
      // Get batch status first
      const statusUrl = `https://generativelanguage.googleapis.com/v1beta/${batchId}?key=${apiKey}`;
      const statusResponse = await fetch(statusUrl);
      const batchStatus = await statusResponse.json();

      if (batchStatus.state !== 'JOB_STATE_SUCCEEDED') {
        return NextResponse.json({ 
          error: 'Batch not completed yet', 
          state: batchStatus.state 
        }, { status: 400 });
      }

      // Extract output file from batch status or construct it
      const shortId = batchId.replace('batches/', '');
      const outputFile = `files/batch-${shortId}`;

      console.log(`Downloading batch ${batchId}...`);
      
      // Download the results file
      const downloadUrl = `https://generativelanguage.googleapis.com/download/v1beta/${outputFile}:download?alt=media&key=${apiKey}`;
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        const error = await response.text();
        return NextResponse.json({ error: 'Failed to download', details: error }, { status: 500 });
      }

      const content = await response.text();
      console.log(`Downloaded ${content.length} bytes`);

      // Determine chunk number from displayName or parameter
      let chunk = chunkNumber ? parseInt(chunkNumber) : null;
      if (!chunk && batchStatus.displayName) {
        const match = batchStatus.displayName.match(/Chunk (\d+)/);
        chunk = match ? parseInt(match[1]) : null;
      }

      if (!chunk) {
        return NextResponse.json({ 
          error: 'Could not determine chunk number',
          hint: 'Pass ?chunk=X parameter'
        }, { status: 400 });
      }

      // Save to output folder - auto-detect or use param
      const dateParam = searchParams.get('date');
      const outputDate = dateParam || await findLatestOutputFolder() || new Date().toISOString().split('T')[0];
      const outputDir = path.join(process.cwd(), 'output', outputDate, 'jsonl');
      await mkdir(outputDir, { recursive: true });
      
      const filePath = path.join(outputDir, `batch-results-chunk-${chunk}.jsonl`);
      await writeFile(filePath, content, 'utf-8');
      console.log(`Saved to ${filePath}`);

      // Count results and extract images
      const lines = content.split('\n').filter(line => line.trim());
      let imagesExtracted = 0;
      const imagesDir = path.join(process.cwd(), 'output', outputDate, 'images');
      await mkdir(imagesDir, { recursive: true });

      for (const line of lines) {
        try {
          const result = JSON.parse(line);
          if (result.response?.candidates?.[0]?.content?.parts) {
            for (const part of result.response.candidates[0].content.parts) {
              if (part.inlineData?.mimeType?.startsWith('image/')) {
                const key = result.key || `unknown-${imagesExtracted}`;
                const sku = key.replace('rug-', '');
                const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
                const imagePath = path.join(imagesDir, `rug-${sku}.png`);
                await writeFile(imagePath, imageBuffer);
                imagesExtracted++;
              }
            }
          }
        } catch {
          // Skip invalid lines
        }
      }

      return NextResponse.json({
        success: true,
        batchId,
        chunk,
        resultCount: lines.length,
        imagesExtracted,
        savedTo: filePath,
      });

    } catch (error) {
      console.error('Error downloading batch:', error);
      return NextResponse.json({ error: String(error) }, { status: 500 });
    }
  }

  // Download all pending batches
  if (action === 'download-all') {
    try {
      // First, get the list of what needs downloading (with pagination)
      const allOperations: Array<{
        name: string;
        metadata: {
          displayName?: string;
          state: string;
          output?: { responsesFile?: string };
        };
      }> = [];
      
      let nextPageToken: string | undefined;
      do {
        const listUrl = nextPageToken 
          ? `https://generativelanguage.googleapis.com/v1beta/batches?key=${apiKey}&pageToken=${nextPageToken}`
          : `https://generativelanguage.googleapis.com/v1beta/batches?key=${apiKey}`;
        const listResponse = await fetch(listUrl);
        const listData = await listResponse.json();
        if (listData.operations) {
          allOperations.push(...listData.operations);
        }
        nextPageToken = listData.nextPageToken;
      } while (nextPageToken);
      
      // Get local chunks - auto-detect the output folder
      const dateParam = searchParams.get('date');
      const outputDate = dateParam || await findLatestOutputFolder() || new Date().toISOString().split('T')[0];
      const jsonlDir = path.join(process.cwd(), 'output', outputDate, 'jsonl');
      let localChunks: number[] = [];
      
      console.log(`[download-all] Using output folder: ${outputDate}`);
      
      try {
        const files = await readdir(jsonlDir);
        localChunks = files
          .filter(f => f.startsWith('batch-results-chunk-') && f.endsWith('.jsonl'))
          .map(f => parseInt(f.replace('batch-results-chunk-', '').replace('.jsonl', '')))
          .filter(n => !isNaN(n));
      } catch {
        // Directory doesn't exist
      }

      const results: Array<{
        chunk: number;
        success?: boolean;
        resultCount?: number;
        imagesExtracted?: number;
        error?: string;
        status?: number;
      }> = [];
      
      for (const operation of allOperations) {
        const metadata = operation.metadata;
        
        // Check if succeeded and not downloaded
        if (metadata.state !== 'BATCH_STATE_SUCCEEDED') continue;
        
        const chunkMatch = metadata.displayName?.match(/Chunk (\d+)/);
        const chunkNumber = chunkMatch ? parseInt(chunkMatch[1]) : null;
        
        if (!chunkNumber || localChunks.includes(chunkNumber)) continue;

        console.log(`Processing chunk ${chunkNumber}...`);
        
        // Use the output file from metadata
        const outputFile = metadata.output?.responsesFile || `files/batch-${operation.name.replace('batches/', '')}`;
        
        try {
          // Download
          const downloadUrl = `https://generativelanguage.googleapis.com/download/v1beta/${outputFile}:download?alt=media&key=${apiKey}`;
          const response = await fetch(downloadUrl);
          
          if (!response.ok) {
            results.push({ chunk: chunkNumber, error: 'Download failed', status: response.status });
            continue;
          }

          const content = await response.text();
          
          // Save JSONL
          const outputDir = path.join(process.cwd(), 'output', outputDate, 'jsonl');
          await mkdir(outputDir, { recursive: true });
          const filePath = path.join(outputDir, `batch-results-chunk-${chunkNumber}.jsonl`);
          await writeFile(filePath, content, 'utf-8');

          // Extract images
          const lines = content.split('\n').filter(line => line.trim());
          let imagesExtracted = 0;
          const imagesDir = path.join(process.cwd(), 'output', outputDate, 'images');
          await mkdir(imagesDir, { recursive: true });

          for (const line of lines) {
            try {
              const result = JSON.parse(line);
              if (result.response?.candidates?.[0]?.content?.parts) {
                for (const part of result.response.candidates[0].content.parts) {
                  if (part.inlineData?.mimeType?.startsWith('image/')) {
                    const key = result.key || `unknown-${imagesExtracted}`;
                    const sku = key.replace('rug-', '');
                    const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
                    const imagePath = path.join(imagesDir, `rug-${sku}.png`);
                    await writeFile(imagePath, imageBuffer);
                    imagesExtracted++;
                  }
                }
              }
            } catch {
              // Skip invalid lines
            }
          }

          results.push({
            chunk: chunkNumber,
            success: true,
            resultCount: lines.length,
            imagesExtracted,
          });

          // Add to local chunks for next iteration
          localChunks.push(chunkNumber);

        } catch (error) {
          results.push({ chunk: chunkNumber, error: String(error) });
        }
      }

      const totalImages = results.reduce((sum, r) => sum + (r.imagesExtracted || 0), 0);
      return NextResponse.json({
        success: true,
        results,
        totalImagesExtracted: totalImages,
        chunksDownloaded: results.filter(r => r.success).length,
      });

    } catch (error) {
      console.error('Error in download-all:', error);
      return NextResponse.json({ error: String(error) }, { status: 500 });
    }
  }

  // Analyze what's missing and provide resume info
  if (action === 'analyze-resume') {
    try {
      const totalRugsParam = searchParams.get('totalRugs');
      const chunkSizeParam = searchParams.get('chunkSize');
      
      if (!totalRugsParam) {
        return NextResponse.json({ 
          error: 'totalRugs parameter required',
          hint: 'Pass the total number of rugs from your CSV'
        }, { status: 400 });
      }
      
      const totalRugs = parseInt(totalRugsParam);
      const chunkSize = chunkSizeParam ? parseInt(chunkSizeParam) : 75;
      const expectedChunks = Math.ceil(totalRugs / chunkSize);
      
      // Get completed chunks from local files
      const dateParam = searchParams.get('date');
      const outputDate = dateParam || await findLatestOutputFolder() || new Date().toISOString().split('T')[0];
      const jsonlDir = path.join(process.cwd(), 'output', outputDate, 'jsonl');
      
      let localChunks: number[] = [];
      try {
        const files = await readdir(jsonlDir);
        localChunks = files
          .filter(f => f.startsWith('batch-results-chunk-') && f.endsWith('.jsonl'))
          .map(f => parseInt(f.replace('batch-results-chunk-', '').replace('.jsonl', '')))
          .filter(n => !isNaN(n))
          .sort((a, b) => a - b);
      } catch {
        // Directory doesn't exist
      }
      
      // Get batches from Gemini to see what's processing or ready
      const allOperations: Array<{
        name: string;
        metadata: { displayName?: string; state: string };
      }> = [];
      
      let nextPageToken: string | undefined;
      do {
        const listUrl = nextPageToken 
          ? `https://generativelanguage.googleapis.com/v1beta/batches?key=${apiKey}&pageToken=${nextPageToken}`
          : `https://generativelanguage.googleapis.com/v1beta/batches?key=${apiKey}`;
        const res = await fetch(listUrl);
        const data = await res.json();
        if (data.operations) allOperations.push(...data.operations);
        nextPageToken = data.nextPageToken;
      } while (nextPageToken);
      
      // Categorize chunks
      const geminiChunks: { [key: number]: string } = {}; // chunk -> state
      for (const op of allOperations) {
        const match = op.metadata.displayName?.match(/Chunk (\d+)/);
        if (match) {
          geminiChunks[parseInt(match[1])] = op.metadata.state;
        }
      }
      
      const completedChunks = localChunks;
      const inGeminiSucceeded: number[] = [];
      const inGeminiProcessing: number[] = [];
      const notStarted: number[] = [];
      
      for (let i = 1; i <= expectedChunks; i++) {
        if (completedChunks.includes(i)) continue;
        
        const geminiState = geminiChunks[i];
        if (geminiState === 'BATCH_STATE_SUCCEEDED') {
          inGeminiSucceeded.push(i);
        } else if (geminiState === 'BATCH_STATE_RUNNING' || geminiState === 'BATCH_STATE_PENDING') {
          inGeminiProcessing.push(i);
        } else {
          notStarted.push(i);
        }
      }
      
      // Calculate which rugs need to be processed
      const completedRugs = completedChunks.length * chunkSize;
      const inProgressRugs = (inGeminiSucceeded.length + inGeminiProcessing.length) * chunkSize;
      const remainingRugs = Math.max(0, totalRugs - completedRugs - inProgressRugs);
      
      return NextResponse.json({
        success: true,
        outputDate,
        analysis: {
          totalRugs,
          chunkSize,
          expectedChunks,
          completedChunks: completedChunks.length,
          inGeminiSucceeded: inGeminiSucceeded.length,
          inGeminiProcessing: inGeminiProcessing.length,
          notStarted: notStarted.length,
        },
        resume: {
          // These chunks need to be downloaded from Gemini first
          downloadFirst: inGeminiSucceeded,
          // These are still processing in Gemini
          waitingFor: inGeminiProcessing,
          // These chunks haven't been started - need to process from CSV
          chunksToProcess: notStarted,
          // Start from this rug index (0-based)
          startFromRugIndex: (Math.min(...notStarted) - 1) * chunkSize,
          remainingRugs,
        },
        chunks: {
          completed: completedChunks,
          inGeminiSucceeded,
          inGeminiProcessing,
          notStarted,
        }
      });
      
    } catch (error) {
      console.error('Error in analyze-resume:', error);
      return NextResponse.json({ error: String(error) }, { status: 500 });
    }
  }

  return NextResponse.json({
    usage: {
      status: '/api/recover-batch?action=status - List all batches and what needs downloading',
      downloadOne: '/api/recover-batch?action=download&batchId=batches/xxxxx',
      downloadAll: '/api/recover-batch?action=download-all - Download all pending succeeded batches',
      analyzeResume: '/api/recover-batch?action=analyze-resume&totalRugs=1725&chunkSize=75 - Analyze what needs to be resumed',
    }
  });
}
