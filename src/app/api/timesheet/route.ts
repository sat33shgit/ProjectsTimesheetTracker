import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { timesheetEntries, projects } from "@/lib/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { localDateToUTC } from "@/lib/utils/date";
import {
  parseId,
  parseHours,
  isValidDateString,
  optionalText,
  sanitizeSearchTerm,
} from "@/lib/utils/api-auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search");

    const conditions = [];

    if (projectId) {
      const id = parseId(projectId);
      if (id === null) {
        return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
      }
      conditions.push(eq(timesheetEntries.projectId, id));
    }
    if (dateFrom) {
      if (!isValidDateString(dateFrom)) {
        return NextResponse.json({ error: "Invalid dateFrom" }, { status: 400 });
      }
      conditions.push(gte(timesheetEntries.date, new Date(dateFrom)));
    }
    if (dateTo) {
      if (!isValidDateString(dateTo)) {
        return NextResponse.json({ error: "Invalid dateTo" }, { status: 400 });
      }
      conditions.push(lte(timesheetEntries.date, new Date(dateTo)));
    }
    if (search) {
      const term = "%" + sanitizeSearchTerm(search) + "%";
      conditions.push(
        sql`(${projects.name} ILIKE ${term} OR ${timesheetEntries.subcategory} ILIKE ${term} OR ${timesheetEntries.details} ILIKE ${term})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Single query — total count and total hours are derived from the
    // returned rows instead of two extra round-trips to the database.
    const entries = await db
      .select({
        id: timesheetEntries.id,
        projectId: timesheetEntries.projectId,
        projectName: projects.name,
        date: sql<string>`to_char(${timesheetEntries.date}, 'YYYY-MM-DD')`.as("date"),
        hours: timesheetEntries.hours,
        subcategory: timesheetEntries.subcategory,
        details: timesheetEntries.details,
        createdAt: timesheetEntries.createdAt,
        updatedAt: timesheetEntries.updatedAt,
      })
      .from(timesheetEntries)
      .innerJoin(projects, eq(timesheetEntries.projectId, projects.id))
      .where(whereClause)
      .orderBy(desc(timesheetEntries.date));

    const totalHours = entries.reduce((sum, e) => sum + Number(e.hours), 0);

    return NextResponse.json({
      entries,
      total: entries.length,
      totalHours,
    });
  } catch (error) {
    console.error("Failed to fetch timesheet:", error);
    return NextResponse.json({ error: "Failed to fetch timesheet" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, date, hours, subcategory, details } = body;

    const parsedProjectId = parseId(String(projectId ?? ""));
    if (parsedProjectId === null) {
      return NextResponse.json({ error: "A valid project is required" }, { status: 400 });
    }

    if (!isValidDateString(date)) {
      return NextResponse.json({ error: "A valid date (YYYY-MM-DD) is required" }, { status: 400 });
    }

    const parsedHours = parseHours(hours);
    if (parsedHours === null) {
      return NextResponse.json({ error: "Hours must be between 0.25 and 24" }, { status: 400 });
    }

    const cleanSubcategory = optionalText(subcategory, 255);
    const cleanDetails = optionalText(details);
    if (cleanSubcategory === undefined || cleanDetails === undefined) {
      return NextResponse.json({ error: "Subcategory or details is invalid or too long" }, { status: 400 });
    }

    const [entry] = await db
      .insert(timesheetEntries)
      .values({
        projectId: parsedProjectId,
        date: localDateToUTC(date),
        hours: String(parsedHours),
        subcategory: cleanSubcategory,
        details: cleanDetails,
      })
      .returning();

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Failed to create timesheet entry:", error);
    return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
  }
}
