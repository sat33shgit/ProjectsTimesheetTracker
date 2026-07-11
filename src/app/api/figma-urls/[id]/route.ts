import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { figmaUrls } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseId } from "@/lib/utils/api-auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) {
      return NextResponse.json({ error: "Invalid url id" }, { status: 400 });
    }

    const body = await request.json();
    const { application, url, details } = body;

    if (url !== undefined) {
      const urlPattern = /^https?:\/\/(www\.)?figma\.com\/.+/i;
      if (!urlPattern.test(url)) {
        return NextResponse.json({ error: "Please provide a valid Figma URL" }, { status: 400 });
      }
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (application !== undefined) updates.application = application.trim();
    if (url !== undefined) updates.url = url.trim();
    if (details !== undefined) updates.details = details || null;

    const [updated] = await db
      .update(figmaUrls)
      .set(updates)
      .where(eq(figmaUrls.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "URL not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update figma url:", error);
    return NextResponse.json({ error: "Failed to update figma url" }, { status: 500 });
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
      return NextResponse.json({ error: "Invalid url id" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(figmaUrls)
      .where(eq(figmaUrls.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "URL not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete figma url:", error);
    return NextResponse.json({ error: "Failed to delete figma url" }, { status: 500 });
  }
}
