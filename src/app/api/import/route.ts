import { NextResponse } from "next/server";
import { parseExcelBuffer } from "@/lib/utils/excel";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const preview = parseExcelBuffer(buffer);

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
