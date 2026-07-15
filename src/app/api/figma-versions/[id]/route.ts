import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { figmaVersions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseId, requireString, optionalText } from "@/lib/utils/api-auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json({ error: "Invalid version id" }, { status: 400 });
    }

    const body = await request.json();
    const { application, version, details } = body;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (application !== undefined) {
      const cleanApp = requireString(application, 255);
      if (cleanApp === null) {
        return NextResponse.json({ error: "Application must be a non-empty string" }, { status: 400 });
      }
      updates.application = cleanApp;
    }
    if (version !== undefined) {
      const versionNum = Number(version);
      if (!Number.isSafeInteger(versionNum) || versionNum <= 0) {
        return NextResponse.json({ error: "Version must be a positive integer" }, { status: 400 });
      }
      updates.version = versionNum;
    }
    if (details !== undefined) {
      const clean = optionalText(details);
      if (clean === undefined) {
        return NextResponse.json({ error: "Details is invalid or too long" }, { status: 400 });
      }
      updates.details = clean;
    }

    const [updated] = await db
      .update(figmaVersions)
      .set(updates)
      .where(eq(figmaVersions.id, id))
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
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json({ error: "Invalid version id" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(figmaVersions)
      .where(eq(figmaVersions.id, id))
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
