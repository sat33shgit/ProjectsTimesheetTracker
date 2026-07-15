import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { timesheetEntries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { localDateToUTC } from "@/lib/utils/date";
import { parseId, parseHours, isValidDateString, optionalText } from "@/lib/utils/api-auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json({ error: "Invalid entry id" }, { status: 400 });
    }

    const body = await request.json();
    const { projectId, date, hours, subcategory, details } = body;

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (projectId !== undefined) {
      const parsedProjectId = parseId(String(projectId));
      if (parsedProjectId === null) {
        return NextResponse.json({ error: "Invalid project" }, { status: 400 });
      }
      updates.projectId = parsedProjectId;
    }
    if (date !== undefined) {
      if (!isValidDateString(date)) {
        return NextResponse.json({ error: "Invalid date (expected YYYY-MM-DD)" }, { status: 400 });
      }
      updates.date = localDateToUTC(date);
    }
    if (hours !== undefined) {
      const parsedHours = parseHours(hours);
      if (parsedHours === null) {
        return NextResponse.json({ error: "Hours must be between 0.25 and 24" }, { status: 400 });
      }
      updates.hours = String(parsedHours);
    }
    if (subcategory !== undefined) {
      const clean = optionalText(subcategory, 255);
      if (clean === undefined) {
        return NextResponse.json({ error: "Subcategory is invalid or too long" }, { status: 400 });
      }
      updates.subcategory = clean;
    }
    if (details !== undefined) {
      const clean = optionalText(details);
      if (clean === undefined) {
        return NextResponse.json({ error: "Details is invalid or too long" }, { status: 400 });
      }
      updates.details = clean;
    }

    const [updated] = await db
      .update(timesheetEntries)
      .set(updates)
      .where(eq(timesheetEntries.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update timesheet entry:", error);
    return NextResponse.json({ error: "Failed to update entry" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json({ error: "Invalid entry id" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(timesheetEntries)
      .where(eq(timesheetEntries.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete timesheet entry:", error);
    return NextResponse.json({ error: "Failed to delete entry" }, { status: 500 });
  }
}
