import csv from 'csv-parser';
import { Readable } from 'stream';
import { RugData, ProcessedRug } from '@/types/rug';
import { getDecorStyle, normalizeShape, getAmbienteFromShape, buildPrompt } from './rug-utils';
import { logger } from "./logger";

interface CSVRow {
  [key: string]: string;
}

export function parseCSVFromBuffer(buffer: Buffer): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    const results: CSVRow[] = [];
    const stream = Readable.from(buffer);
    const startTime = Date.now();

    logger.info("CSV_PARSING", "Starting CSV parsing", {
      bufferSize: buffer.length,
    });
    
    stream
      .pipe(csv())
      .on("data", (data: CSVRow) => results.push(data))
      .on("end", () => {
        const duration = Date.now() - startTime;
        logger.info("CSV_PARSING", "CSV parsing completed", {
          rowCount: results.length,
          duration,
          avgTimePerRow: results.length > 0 ? duration / results.length : 0,
        });
        resolve(results);
      })
      .on("error", (error) => {
        logger.error("CSV_PARSING", "CSV parsing failed", error, {
          duration: Date.now() - startTime,
          partialRows: results.length,
        });
        reject(error);
      });
  });
}

export function mapRowToRugData(row: CSVRow): RugData {
  // Handle BOM (Byte Order Mark) in SKU column - Excel adds this to UTF-8 CSV files
  const sku = row["SKU"] || row["\ufeffSKU"] || "";

  // Debug: Log first row's keys to see what we're getting
  const keys = Object.keys(row);
  if (keys.length > 0) {
    console.log(
      "[CSV] Row keys sample:",
      keys.slice(0, 3),
      "SKU value:",
      sku || "(empty)"
    );
  }

  const title = row["Title"] || "";
  const description = row["Description"] || "";
  const primaryCategory = row["Primary Category"] || "";
  const secondaryCategory = row["Secondary Category"] || "";

  // Pile / Foundation (supports both variants)
  const pile = row["Pile"] || row["Rug Pile"] || "";
  const foundation = row["Foundation"] || row["Rug Foundation"] || "";

  // Colors: supports names from both CSV variants
  const borderColor = row["borderColor"] || row["Rug Border Color"] || "";
  const fieldColor = row["fieldColor"] || row["Rug Field Color"] || "";
  const exactFieldColor = row["Exact Field Color"] || "";

  const otherColorsRaw = row["otherColors"] || row["Other Color"] || "";

  // Other fields
  const weight = row["Weight"] || "";
  const style = row["Style"] || "";
  const material = row["Material"] || "";
  const weavetype = row["Weavetype"] || "";
  const rugtype = row["Rugtype"] || "";
  const origin = row["Origin"] || "";
  const imageLink = row["image link"] || row["image_link"] || "";
  const color = row["color"] || "";
  const exactSize = row["exactSize"] || row["Exact Size"] || "";
  const size = row["size"] || "";
  const totalSqFt = row["total Sq Ft"] || row["total_sq_ft"] || "";
  const stockShape = row["Stock Shape"] || "";

  // Parse list of additional colors
  const otherColors = otherColorsRaw
    ? otherColorsRaw
        .split(/[;,]/)
        .map((c: string) => c.trim())
        .filter(Boolean)
    : [];

  const shape = normalizeShape(stockShape);
  const ambiente = getAmbienteFromShape(shape);
  const decorStyle = getDecorStyle(primaryCategory);

  return {
    sku,
    title,
    description,
    primaryCategory,
    secondaryCategory,
    pile,
    foundation,
    borderColor,
    fieldColor,
    exactFieldColor,
    otherColors,
    weight,
    style,
    material,
    weavetype,
    rugtype,
    origin,
    imageLink,
    color,
    exactSize,
    size,
    totalSqFt,
    stockShape,
    shape,
    ambiente,
    decorStyle,
  };
}

export function processRugsFromCSV(csvData: CSVRow[]): ProcessedRug[] {
  const startTime = Date.now();
  logger.info("RUG_PROCESSING", "Starting rug processing", {
    totalRugs: csvData.length,
  });

  try {
    const processedRugs = csvData.map((row, index) => {
      try {
        const rugData = mapRowToRugData(row);
        const prompt = buildPrompt(rugData);

        if (rugData.sku) {
          logger.debug("RUG_PROCESSING", "Processed rug", {
            rugSku: rugData.sku,
            index: index + 1,
            totalRugs: csvData.length,
          });
        }

        return {
          ...rugData,
          prompt,
        };
      } catch (error) {
        logger.error(
          "RUG_PROCESSING",
          `Failed to process rug at index ${index}`,
          error as Error,
          {
            rowData: row,
            index,
          }
        );
        throw error;
      }
    });

    const duration = Date.now() - startTime;
    logger.info("RUG_PROCESSING", "Rug processing completed", {
      processedRugs: processedRugs.length,
      duration,
      avgTimePerRug:
        processedRugs.length > 0 ? duration / processedRugs.length : 0,
    });

    return processedRugs;
  } catch (error) {
    logger.error("RUG_PROCESSING", "Rug processing failed", error as Error, {
      duration: Date.now() - startTime,
      totalRugs: csvData.length,
    });
    throw error;
  }
}

/**
 * Split an array into chunks of specified size
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Process CSV data and split into chunks of 150 lines each
 */
export function processRugsInChunks(
  csvData: CSVRow[],
  chunkSize: number = 150
): ProcessedRug[][] {
  const startTime = Date.now();
  logger.info("CHUNKING", "Starting chunking process", {
    totalRugs: csvData.length,
    chunkSize,
    expectedChunks: Math.ceil(csvData.length / chunkSize),
  });

  try {
    const allProcessedRugs = processRugsFromCSV(csvData);
    const chunks = chunkArray(allProcessedRugs, chunkSize);

    const duration = Date.now() - startTime;
    logger.info("CHUNKING", "Chunking completed", {
      totalRugs: csvData.length,
      chunkSize,
      chunksCreated: chunks.length,
      duration,
      avgRugsPerChunk: chunks.length > 0 ? csvData.length / chunks.length : 0,
    });

    return chunks;
  } catch (error) {
    logger.error("CHUNKING", "Chunking failed", error as Error, {
      totalRugs: csvData.length,
      chunkSize,
      duration: Date.now() - startTime,
    });
    throw error;
  }
}

/**
 * Convert processed rugs back to CSV format
 */
export function convertRugsToCSV(rugs: ProcessedRug[]): string {
  if (rugs.length === 0) return "";

  // Get all possible keys from the first rug
  const headers = Object.keys(rugs[0]);

  // Create CSV header row
  const csvLines = [headers.join(",")];

  // Add data rows
  rugs.forEach((rug) => {
    const row = headers.map((header) => {
      const value = rug[header as keyof ProcessedRug];
      // Handle arrays (like otherColors) and escape commas/quotes
      if (Array.isArray(value)) {
        return `"${value.join(";")}"`;
      }
      // Escape quotes and wrap in quotes if contains comma
      const stringValue = String(value || "");
      if (
        stringValue.includes(",") ||
        stringValue.includes('"') ||
        stringValue.includes("\n")
      ) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvLines.push(row.join(","));
  });

  return csvLines.join("\n");
}

/**
 * Create multiple CSV files from chunks
 */
export function createChunkedCSVFiles(
  csvData: CSVRow[],
  chunkSize: number = 150
): { filename: string; content: string }[] {
  const startTime = Date.now();
  logger.info("CSV_GENERATION", "Creating chunked CSV files", {
    totalRugs: csvData.length,
    chunkSize,
  });

  try {
    const chunks = processRugsInChunks(csvData, chunkSize);

    const files = chunks.map((chunk, index) => {
      const filename = `batch-${String(index + 1).padStart(3, "0")}-${
        chunk.length
      }rugs.csv`;
      const content = convertRugsToCSV(chunk);

      logger.logChunkOperation(index, "CSV_FILE_CREATED", true, {
        filename,
        rugCount: chunk.length,
        fileSize: content.length,
      });

      return {
        filename,
        content,
      };
    });

    const duration = Date.now() - startTime;
    const totalSize = files.reduce((sum, file) => sum + file.content.length, 0);

    logger.info("CSV_GENERATION", "Chunked CSV files created successfully", {
      filesCreated: files.length,
      totalRugs: csvData.length,
      totalSize,
      avgFileSize: files.length > 0 ? totalSize / files.length : 0,
      duration,
    });

    return files;
  } catch (error) {
    logger.error(
      "CSV_GENERATION",
      "Failed to create chunked CSV files",
      error as Error,
      {
        totalRugs: csvData.length,
        chunkSize,
        duration: Date.now() - startTime,
      }
    );
    throw error;
  }
}
