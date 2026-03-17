import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, timesheetEntries, figmaVersions, figmaUrls, settings } from "@/lib/db/schema";

export async function DELETE() {
  try {
    await db.delete(timesheetEntries);
    await db.delete(figmaVersions);
    await db.delete(figmaUrls);
    await db.delete(projects);
    await db.delete(settings);

    // Re-seed defaults
    await db.insert(settings).values([
      { key: "hourly_rate_cad", value: "10" },
      { key: "conversion_rate_inr", value: "60" },
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to reset data:", error);
    return NextResponse.json({ error: "Failed to reset data" }, { status: 500 });
  }
}
