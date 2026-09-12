import * as XLSX from "xlsx";
import { ImportFileFormat, ParsedSpreadsheet } from "./types";

export const MAX_IMPORT_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_IMPORT_ROWS = 5000; // Safe in-memory boundary for free tier

export interface ParseOptions {
  fileName: string;
  buffer: Buffer | Uint8Array;
}

/**
 * Validates and parses a CSV or XLSX buffer into structured records and headers.
 * Operates 100% locally in-process with zero network requests.
 */
export function parseSpreadsheetBuffer({ fileName, buffer }: ParseOptions): ParsedSpreadsheet {
  if (!buffer || buffer.length === 0) {
    throw new Error("Uploaded file is empty.");
  }

  if (buffer.length > MAX_IMPORT_FILE_SIZE_BYTES) {
    throw new Error(
      `File size (${(buffer.length / (1024 * 1024)).toFixed(2)}MB) exceeds maximum permitted limit of 10MB.`
    );
  }

  const extension = fileName.split(".").pop()?.toLowerCase();
  let fileFormat: ImportFileFormat;
  if (extension === "csv") {
    fileFormat = "csv";
  } else if (extension === "xlsx" || extension === "xls") {
    fileFormat = "xlsx";
  } else {
    throw new Error(`Unsupported file type: .${extension}. Only .csv and .xlsx files are supported.`);
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, {
      type: "buffer",
      cellDates: true,
      raw: false,
      dense: true,
    });
  } catch (err: any) {
    throw new Error(`Failed to parse spreadsheet: ${err?.message || "Invalid or corrupt file structure."}`);
  }

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("The uploaded spreadsheet does not contain any readable sheets.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) {
    throw new Error("Unable to read the first worksheet from the workbook.");
  }

  // Convert worksheet to array of objects with raw headers
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    blankrows: false,
  }) as any[];

  if (!rawRows || rawRows.length === 0) {
    throw new Error("The spreadsheet is empty and contains no data or header rows.");
  }

  // First row is headers
  const headerRow = rawRows[0] as any[];
  const headers: string[] = headerRow
    .map((h) => String(h || "").trim())
    .filter((h) => h.length > 0);

  if (headers.length === 0) {
    throw new Error("The spreadsheet does not contain any valid column headers in the first row.");
  }

  // Process data rows
  const dataRows: Record<string, any>[] = [];
  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i] as any[];
    if (!row || row.length === 0) continue;

    // Check if entire row is empty
    const hasData = row.some((val) => val !== null && val !== undefined && String(val).trim() !== "");
    if (!hasData) continue;

    const rowObj: Record<string, any> = {};
    headers.forEach((header, index) => {
      const cellVal = row[index];
      rowObj[header] = cellVal !== null && cellVal !== undefined ? cellVal : "";
    });

    dataRows.push(rowObj);

    if (dataRows.length >= MAX_IMPORT_ROWS) {
      break;
    }
  }

  return {
    fileName,
    fileFormat,
    fileSizeBytes: buffer.length,
    headers,
    rows: dataRows,
    totalRows: dataRows.length,
  };
}

