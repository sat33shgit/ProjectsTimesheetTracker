import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { figmaVersions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { application, version, details } = body;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (application !== undefined) updates.application = application.trim();
    if (version !== undefined) updates.version = Number(version);
    if (details !== undefined) updates.details = details || null;

    const [updated] = await db
      .update(figmaVersions)
      .set(updates)
      .where(eq(figmaVersions.id, Number(id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("unique") || message.includes("duplicate")) {
      return NextResponse.json({ error: "This version already exists for this application" }, { status: 409 });
    }
    console.error("Failed to update figma version:", error);
    return NextResponse.json({ error: "Failed to update figma version" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [deleted] = await db
      .delete(figmaVersions)
      .where(eq(figmaVersions.id, Number(id)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete figma version:", error);
    return NextResponse.json({ error: "Failed to delete figma version" }, { status: 500 });
  }
}
