import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { timesheetEntries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { projectId, date, hours, details } = body;

    if (hours !== undefined && (Number(hours) <= 0 || Number(hours) > 24)) {
      return NextResponse.json({ error: "Hours must be between 0.25 and 24" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (projectId !== undefined) updates.projectId = Number(projectId);
    if (date !== undefined) updates.date = new Date(date);
    if (hours !== undefined) updates.hours = String(hours);
    if (details !== undefined) updates.details = details || null;

    const [updated] = await db
      .update(timesheetEntries)
      .set(updates)
      .where(eq(timesheetEntries.id, Number(id)))
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
    const { id } = await params;
    const [deleted] = await db
      .delete(timesheetEntries)
      .where(eq(timesheetEntries.id, Number(id)))
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
