import fs from 'fs-extra';
import path from 'path';
import XLSX from 'xlsx';
import pdfParse from 'pdf-parse';

interface ProcessResult {
  filename: string;
}

interface ExtractedData {
  date: string;
  description: string;
  amount: string;
  balance: string;
}

export async function processFile(
  filePath: string,
  outputFormat: 'xlsx' | 'csv'
): Promise<ProcessResult> {
  try {
    // Read the PDF file
    const dataBuffer = await fs.readFile(filePath);
    const pdfData = await pdfParse(dataBuffer);

    // Extract data from PDF text
    const extractedData = extractDataFromText(pdfData.text);

    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, '..', 'downloads');
    await fs.ensureDir(outputDir);

    // Generate output filename
    const timestamp = new Date().getTime();
    const outputFilename = `converted-statement-${timestamp}.${outputFormat}`;
    const outputPath = path.join(outputDir, outputFilename);

    // Convert and save the data
    await convertAndSaveData(extractedData, outputPath, outputFormat);

    // Clean up the uploaded file
    await fs.remove(filePath);

    return { filename: outputFilename };
  } catch (error) {
    // Clean up the uploaded file in case of error
    await fs.remove(filePath);
    throw error;
  }
}

function extractDataFromText(text: string): ExtractedData[] {
  const lines = text.split('\n').filter(line => line.trim());
  const data: ExtractedData[] = [];

  // This is a basic example - you'll need to adjust the parsing logic
  // based on your specific PDF statement format
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip headers and empty lines
    if (line.length === 0 || line.toLowerCase().includes('date') || line.toLowerCase().includes('balance')) {
      continue;
    }

    // Example pattern matching for date (DD/MM/YYYY)
    const datePattern = /\d{2}\/\d{2}\/\d{4}/;
    const dateMatch = line.match(datePattern);

    if (dateMatch) {
      const date = dateMatch[0];
      // Extract other fields - this is a simplified example
      const parts = line.split(/\s+/);
      
      data.push({
        date,
        description: parts.slice(1, -2).join(' '),
        amount: parts[parts.length - 2],
        balance: parts[parts.length - 1]
      });
    }
  }

  return data;
}

async function convertAndSaveData(
  data: ExtractedData[],
  outputPath: string,
  format: 'xlsx' | 'csv'
): Promise<void> {
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Statement');

  // Write to file
  if (format === 'xlsx') {
    XLSX.writeFile(wb, outputPath);
  } else {
    // For CSV, we'll use the CSV export
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    await fs.writeFile(outputPath, csvContent);
  }
} 