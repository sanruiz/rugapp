import csv from 'csv-parser';
import { Readable } from 'stream';
import { RugData, ProcessedRug } from '@/types/rug';
import { getDecorStyle, normalizeShape, getAmbienteFromShape, buildPrompt } from './rug-utils';

interface CSVRow {
  [key: string]: string;
}

export function parseCSVFromBuffer(buffer: Buffer): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    const results: CSVRow[] = [];
    const stream = Readable.from(buffer);
    
    stream
      .pipe(csv())
      .on('data', (data: CSVRow) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

export function mapRowToRugData(row: CSVRow): RugData {
  const sku = row["SKU"] || "";
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
    ? otherColorsRaw.split(/[;,]/).map((c: string) => c.trim()).filter(Boolean)
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
    decorStyle
  };
}

export function processRugsFromCSV(csvData: CSVRow[]): ProcessedRug[] {
  return csvData.map(row => {
    const rugData = mapRowToRugData(row);
    const prompt = buildPrompt(rugData);
    
    return {
      ...rugData,
      prompt
    };
  });
}
