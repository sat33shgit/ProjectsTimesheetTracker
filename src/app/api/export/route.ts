import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, timesheetEntries, figmaVersions, figmaUrls, settings } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { generateExcelBuffer } from "@/lib/utils/excel";
import { formatDateISO } from "@/lib/utils/format";

export async function GET() {
  try {
    // Get settings
    const allSettings = await db.select().from(settings);
    const settingsMap: Record<string, string> = {};
    for (const s of allSettings) {
      settingsMap[s.key] = s.value;
    }
    const hourlyRate = Number(settingsMap["hourly_rate_cad"] || "10");
    const conversionRate = Number(settingsMap["conversion_rate_inr"] || "60");

    // Dashboard project summary
    const projectSummary = await db
      .select({
        projectName: projects.name,
        totalHours: sql<string>`COALESCE(SUM(${timesheetEntries.hours}), 0)`,
      })
      .from(projects)
      .leftJoin(timesheetEntries, eq(projects.id, timesheetEntries.projectId))
      .groupBy(projects.name)
      .orderBy(projects.name);

    const dashProjects = projectSummary
      .filter((p) => Number(p.totalHours) > 0)
      .map((p) => {
        const hours = Number(p.totalHours);
        return {
          name: p.projectName,
          totalHours: hours,
          cad: hours * hourlyRate,
          inr: hours * hourlyRate * conversionRate,
        };
      });

    const grandTotalHours = dashProjects.reduce((s, p) => s + p.totalHours, 0);

    // Timesheet entries
    const tsEntries = await db
      .select({
        projectName: projects.name,
        date: sql<string>`to_char(${timesheetEntries.date}, 'YYYY-MM-DD')`.as("date"),
        hours: timesheetEntries.hours,
        details: timesheetEntries.details,
      })
      .from(timesheetEntries)
      .innerJoin(projects, eq(timesheetEntries.projectId, projects.id))
      .orderBy(desc(timesheetEntries.date));

    const timesheetData = tsEntries.map((e) => ({
      projectName: e.projectName,
      date: e.date || "",
      hours: Number(e.hours),
      details: e.details || "",
    }));

    // Figma versions
    const fvEntries = await db
      .select()
      .from(figmaVersions)
      .orderBy(figmaVersions.application, desc(figmaVersions.version));

    const fvData = fvEntries.map((e) => ({
      application: e.application,
      version: e.version,
      details: e.details || "",
    }));

    // Figma urls
    const fuEntries = await db
      .select()
      .from(figmaUrls)
      .orderBy(figmaUrls.application);

    const fuData = fuEntries.map((e) => ({
      application: e.application,
      url: e.url,
      details: e.details || "",
    }));

    const buffer = generateExcelBuffer({
      dashboardSummary: {
        rate: hourlyRate,
        projects: dashProjects,
        grandTotal: {
          totalHours: grandTotalHours,
          cad: grandTotalHours * hourlyRate,
          inr: grandTotalHours * hourlyRate * conversionRate,
        },
      },
      timesheet: timesheetData,
      figmaVersions: fvData,
      figmaUrls: fuData,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="ProjectsTimesheet_Export.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Failed to export:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
