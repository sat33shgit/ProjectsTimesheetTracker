import { NextResponse } from "next/server";
import { parseExcelBuffer } from "@/lib/utils/excel";

const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = [".xlsx"];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const name = file.name || "";
    const hasAllowedExtension = ALLOWED_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));
    if (!hasAllowedExtension) {
      return NextResponse.json({ error: "Only .xlsx files are supported" }, { status: 400 });
    }

    if (file.size > MAX_IMPORT_FILE_BYTES) {
      return NextResponse.json({ error: "File is too large (10MB max)" }, { status: 413 });
    }

    const buffer = await file.arrayBuffer();
    const preview = await parseExcelBuffer(buffer);

    return NextResponse.json({
      timesheetCount: preview.timesheet.length,
      figmaVersionsCount: preview.figmaVersions.length,
      figmaUrlsCount: preview.figmaUrls.length,
      preview,
    });
  } catch (error) {
    console.error("Failed to parse import file:", error);
    return NextResponse.json({ error: "Failed to parse the uploaded file" }, { status: 500 });
  }
}
