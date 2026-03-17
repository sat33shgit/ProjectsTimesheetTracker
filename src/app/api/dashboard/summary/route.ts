import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { timesheetEntries, projects, settings } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

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

    // Project earnings summary
    const projectSummary = await db
      .select({
        projectId: projects.id,
        projectName: projects.name,
        totalHours: sql<string>`COALESCE(SUM(${timesheetEntries.hours}), 0)`,
      })
      .from(projects)
      .leftJoin(timesheetEntries, eq(projects.id, timesheetEntries.projectId))
      .groupBy(projects.id, projects.name)
      .orderBy(projects.name);

    const projectData = projectSummary.map((p) => {
      const hours = Number(p.totalHours);
      const cad = hours * hourlyRate;
      const inr = cad * conversionRate;
      return {
        projectId: p.projectId,
        projectName: p.projectName,
        totalHours: hours,
        earningsCAD: cad,
        earningsINR: inr,
      };
    });

    const totalHours = projectData.reduce((sum, p) => sum + p.totalHours, 0);
    const totalCAD = totalHours * hourlyRate;
    const totalINR = totalCAD * conversionRate;
    const activeProjects = projectData.filter((p) => p.totalHours > 0).length;

    // Top 8 projects by hours for chart
    const topProjects = [...projectData]
      .filter((p) => p.totalHours > 0)
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, 8);

    return NextResponse.json({
      kpis: {
        totalHours,
        totalCAD,
        totalINR,
        activeProjects,
      },
      hourlyRate,
      conversionRate,
      projects: projectData.filter((p) => p.totalHours > 0),
      topProjects,
    });
  } catch (error) {
    console.error("Failed to fetch dashboard summary:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard summary" }, { status: 500 });
  }
}
