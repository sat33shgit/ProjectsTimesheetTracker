import * as XLSX from "xlsx";

export interface TimesheetRow {
  projectName: string;
  date: string;
  hours: number;
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

export function parseExcelBuffer(buffer: ArrayBuffer): ImportPreview {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const result: ImportPreview = {
    timesheet: [],
    figmaVersions: [],
    figmaUrls: [],
  };

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const lowerName = sheetName.trim().toLowerCase();

    if (lowerName.includes("timesheet")) {
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      result.timesheet = rows.map((row) => {
        const rawDate = getVal(row, "Date", "date");
        const dateStr = rawDate instanceof Date
          ? rawDate.toISOString().split("T")[0]
          : String(rawDate || "");
        return {
          projectName: String(getVal(row, "Project Name", "project_name", "Project") || ""),
          date: dateStr,
          hours: Number(getVal(row, "Time (hrs)", "Hours", "hours", "Time") || 0),
          details: String(getVal(row, "Details", "details") || ""),
        };
      }).filter((r) => r.projectName && r.hours > 0);
    } else if (lowerName.includes("figma") && lowerName.includes("version")) {
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      result.figmaVersions = rows.map((row) => ({
        application: String(getVal(row, "Application", "application") || ""),
        version: Number(getVal(row, "Version #", "Version", "version", "Version#") || 0),
        details: String(getVal(row, "Details", "details") || ""),
      })).filter((r) => r.application && r.version > 0);
    } else if (lowerName.includes("figma") && lowerName.includes("url")) {
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      result.figmaUrls = rows.map((row) => ({
        application: String(getVal(row, "Application", "application") || ""),
        url: String(getVal(row, "Figma URL", "URL", "url", "Figma url") || ""),
        details: String(getVal(row, "Details", "details") || ""),
      })).filter((r) => r.application && r.url);
    }
  }

  return result;
}

export function generateExcelBuffer(data: {
  dashboardSummary: { rate: number; projects: { name: string; totalHours: number; cad: number; inr: number }[]; grandTotal: { totalHours: number; cad: number; inr: number } };
  timesheet: { projectName: string; date: string; hours: number; details: string }[];
  figmaVersions: { application: string; version: number; details: string }[];
  figmaUrls: { application: string; url: string; details: string }[];
}): Buffer {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Dashboard
  const dashData: unknown[][] = [
    ["Hourly Rate (CAD)", data.dashboardSummary.rate],
    [],
    ["Project Name", "Total Hrs", "Earnings (CAD)", "Earnings (INR)"],
  ];
  for (const p of data.dashboardSummary.projects) {
    dashData.push([p.name, p.totalHours, p.cad, p.inr]);
  }
  dashData.push([]);
  dashData.push(["Grand Total", data.dashboardSummary.grandTotal.totalHours, data.dashboardSummary.grandTotal.cad, data.dashboardSummary.grandTotal.inr]);
  const dashSheet = XLSX.utils.aoa_to_sheet(dashData);
  XLSX.utils.book_append_sheet(workbook, dashSheet, "Dashboard");

  // Sheet 2: Timesheet
  const tsData = data.timesheet.map((r) => ({
    "Project Name": r.projectName,
    Date: r.date,
    "Time (hrs)": r.hours,
    Details: r.details,
  }));
  const tsSheet = XLSX.utils.json_to_sheet(tsData);
  XLSX.utils.book_append_sheet(workbook, tsSheet, "Timesheet");

  // Sheet 3: Figma Versions
  const fvData = data.figmaVersions.map((r) => ({
    Application: r.application,
    "Version #": r.version,
    Details: r.details,
  }));
  const fvSheet = XLSX.utils.json_to_sheet(fvData);
  XLSX.utils.book_append_sheet(workbook, fvSheet, "Figma Versions");

  // Sheet 4: Figma URLs
  const fuData = data.figmaUrls.map((r) => ({
    Application: r.application,
    "Figma URL": r.url,
    Details: r.details,
  }));
  const fuSheet = XLSX.utils.json_to_sheet(fuData);
  XLSX.utils.book_append_sheet(workbook, fuSheet, "Figma URLs");

  const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return buf;
}
