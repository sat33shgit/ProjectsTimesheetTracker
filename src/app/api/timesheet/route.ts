import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { timesheetEntries, projects } from "@/lib/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search");

    const conditions = [];

    if (projectId) {
      conditions.push(eq(timesheetEntries.projectId, Number(projectId)));
    }
    if (dateFrom) {
      conditions.push(gte(timesheetEntries.date, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(timesheetEntries.date, new Date(dateTo)));
    }
    if (search) {
      conditions.push(
        sql`(${projects.name} ILIKE ${"%" + search + "%"} OR ${timesheetEntries.details} ILIKE ${"%" + search + "%"})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const entries = await db
      .select({
        id: timesheetEntries.id,
        projectId: timesheetEntries.projectId,
        projectName: projects.name,
        date: sql<string>`to_char(${timesheetEntries.date}, 'YYYY-MM-DD')`.as("date"),
        hours: timesheetEntries.hours,
        details: timesheetEntries.details,
        createdAt: timesheetEntries.createdAt,
        updatedAt: timesheetEntries.updatedAt,
      })
      .from(timesheetEntries)
      .innerJoin(projects, eq(timesheetEntries.projectId, projects.id))
      .where(whereClause)
      .orderBy(desc(timesheetEntries.date));

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(timesheetEntries)
      .innerJoin(projects, eq(timesheetEntries.projectId, projects.id))
      .where(whereClause);

    const [sumResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${timesheetEntries.hours}), 0)` })
      .from(timesheetEntries)
      .innerJoin(projects, eq(timesheetEntries.projectId, projects.id))
      .where(whereClause);

    return NextResponse.json({
      entries,
      total: Number(countResult?.count || 0),
      totalHours: Number(sumResult?.total || 0),
    });
  } catch (error) {
    console.error("Failed to fetch timesheet:", error);
    return NextResponse.json({ error: "Failed to fetch timesheet" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, date, hours, details } = body;

    if (!projectId || !date || !hours) {
      return NextResponse.json({ error: "Project, date, and hours are required" }, { status: 400 });
    }

    if (Number(hours) <= 0 || Number(hours) > 24) {
      return NextResponse.json({ error: "Hours must be between 0.25 and 24" }, { status: 400 });
    }

    const [entry] = await db
      .insert(timesheetEntries)
      .values({
        projectId: Number(projectId),
        date: new Date(date),
        hours: String(hours),
        details: details || null,
      })
      .returning();

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Failed to create timesheet entry:", error);
    return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
  }
}
