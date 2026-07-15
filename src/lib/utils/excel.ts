import ExcelJS from "exceljs";

export interface TimesheetRow {
  projectName: string;
  date: string;
  hours: number;
  subcategory: string;
  details: string;
}

export interface FigmaVersionRow {
  application: string;
  version: number;
  details: string;
}

export interface FigmaUrlRow {
  application: string;
  url: string;
  details: string;
}

export interface ImportPreview {
  timesheet: TimesheetRow[];
  figmaVersions: FigmaVersionRow[];
  figmaUrls: FigmaUrlRow[];
}

// Hard cap on rows read per sheet — protects against memory-exhaustion
// via maliciously large spreadsheets.
const MAX_ROWS_PER_SHEET = 10_000;

/** Normalize an ExcelJS cell value (rich text, formula, hyperlink…) to a primitive. */
function cellToPrimitive(value: ExcelJS.CellValue): unknown {
  if (value === null || value === undefined) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === "object") {
    const v = value as unknown as Record<string, unknown>;
    if ("result" in v) return cellToPrimitive(v.result as ExcelJS.CellValue); // formula
    if ("richText" in v && Array.isArray(v.richText)) {
      return (v.richText as { text: string }[]).map((t) => t.text).join("");
    }
    if ("text" in v) return v.text; // hyperlink
    if ("error" in v) return undefined;
    return undefined;
  }
  return value;
}

/** Convert a worksheet into an array of objects keyed by the header row. */
function sheetToObjects(sheet: ExcelJS.Worksheet): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  const headers: string[] = [];

  const headerRow = sheet.getRow(1);
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const v = cellToPrimitive(cell.value);
    headers[colNumber] = v === undefined ? "" : String(v);
  });

  const lastRow = Math.min(sheet.rowCount, MAX_ROWS_PER_SHEET + 1);
  for (let r = 2; r <= lastRow; r++) {
    const row = sheet.getRow(r);
    const obj: Record<string, unknown> = {};
    let hasValue = false;
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (!header) return;
      const v = cellToPrimitive(cell.value);
      if (v !== undefined && v !== "") {
        obj[header] = v;
        hasValue = true;
      }
    });
    if (hasValue) rows.push(obj);
  }

  return rows;
}

// Case-insensitive, trim-aware key lookup for Excel row objects
function getVal(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) return row[key];
  }
  for (const [rowKey, value] of Object.entries(row)) {
    const normalized = rowKey.trim().toLowerCase();
    for (const key of keys) {
      if (normalized === key.toLowerCase()) return value;
    }
  }
  return undefined;
}

export async function parseExcelBuffer(buffer: ArrayBuffer): Promise<ImportPreview> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const result: ImportPreview = {
    timesheet: [],
    figmaVersions: [],
    figmaUrls: [],
  };

  workbook.eachSheet((sheet) => {
    const lowerName = sheet.name.trim().toLowerCase();

    if (lowerName.includes("timesheet")) {
      const rows = sheetToObjects(sheet);
      result.timesheet = rows.map((row) => {
        const rawDate = getVal(row, "Date", "date");
        const dateStr = rawDate instanceof Date
          ? rawDate.toISOString().split("T")[0]
          : String(rawDate || "");
        return {
          projectName: String(getVal(row, "Project Name", "project_name", "Project") || ""),
          date: dateStr,
          hours: Number(getVal(row, "Time (hrs)", "Hours", "hours", "Time") || 0),
          subcategory: String(getVal(row, "Subcategory", "subcategory") || ""),
          details: String(getVal(row, "Details", "details") || ""),
        };
      }).filter((r) => r.projectName && Number.isFinite(r.hours) && r.hours > 0);
    } else if (lowerName.includes("figma") && lowerName.includes("version")) {
      const rows = sheetToObjects(sheet);
      result.figmaVersions = rows.map((row) => ({
        application: String(getVal(row, "Application", "application") || ""),
        version: Number(getVal(row, "Version #", "Version", "version", "Version#") || 0),
        details: String(getVal(row, "Details", "details") || ""),
      })).filter((r) => r.application && Number.isFinite(r.version) && r.version > 0);
    } else if (lowerName.includes("figma") && lowerName.includes("url")) {
      const rows = sheetToObjects(sheet);
      result.figmaUrls = rows.map((row) => ({
        application: String(getVal(row, "Application", "application") || ""),
        url: String(getVal(row, "Figma URL", "URL", "url", "Figma url") || ""),
        details: String(getVal(row, "Details", "details") || ""),
      })).filter((r) => r.application && r.url);
    }
  });

  return result;
}

export async function generateExcelBuffer(data: {
  dashboardSummary: { rate: number; projects: { name: string; totalHours: number; cad: number; inr: number }[]; grandTotal: { totalHours: number; cad: number; inr: number } };
  timesheet: { projectName: string; date: string; hours: number; subcategory: string; details: string }[];
  figmaVersions: { application: string; version: number; details: string }[];
  figmaUrls: { application: string; url: string; details: string }[];
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Dashboard
  const dashSheet = workbook.addWorksheet("Dashboard");
  dashSheet.addRow(["Hourly Rate (CAD)", data.dashboardSummary.rate]);
  dashSheet.addRow([]);
  dashSheet.addRow(["Project Name", "Total Hrs", "Earnings (CAD)", "Earnings (INR)"]);
  for (const p of data.dashboardSummary.projects) {
    dashSheet.addRow([p.name, p.totalHours, p.cad, p.inr]);
  }
  dashSheet.addRow([]);
  dashSheet.addRow(["Grand Total", data.dashboardSummary.grandTotal.totalHours, data.dashboardSummary.grandTotal.cad, data.dashboardSummary.grandTotal.inr]);

  // Sheet 2: Timesheet
  const tsSheet = workbook.addWorksheet("Timesheet");
  tsSheet.addRow(["Project Name", "Date", "Subcategory", "Time (hrs)", "Details"]);
  for (const r of data.timesheet) {
    tsSheet.addRow([r.projectName, r.date, r.subcategory, r.hours, r.details]);
  }

  // Sheet 3: Figma Versions
  const fvSheet = workbook.addWorksheet("Figma Versions");
  fvSheet.addRow(["Application", "Version #", "Details"]);
  for (const r of data.figmaVersions) {
    fvSheet.addRow([r.application, r.version, r.details]);
  }

  // Sheet 4: Figma URLs
  const fuSheet = workbook.addWorksheet("Figma URLs");
  fuSheet.addRow(["Application", "Figma URL", "Details"]);
  for (const r of data.figmaUrls) {
    fuSheet.addRow([r.application, r.url, r.details]);
  }

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}
