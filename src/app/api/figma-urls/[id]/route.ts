import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { figmaUrls } from "@/lib/db/schema";
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
      return NextResponse.json({ error: "Invalid url id" }, { status: 400 });
    }

    const body = await request.json();
    const { application, url, details } = body;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (url !== undefined) {
      const cleanUrl = requireString(url, 2048);
      const urlPattern = /^https:\/\/(www\.)?figma\.com\/.+/i;
      if (cleanUrl === null || !urlPattern.test(cleanUrl)) {
        return NextResponse.json({ error: "Please provide a valid Figma URL (https://figma.com/…)" }, { status: 400 });
      }
      updates.url = cleanUrl;
    }
    if (application !== undefined) {
      const cleanApp = requireString(application, 255);
      if (cleanApp === null) {
        return NextResponse.json({ error: "Application must be a non-empty string" }, { status: 400 });
      }
      updates.application = cleanApp;
    }
    if (details !== undefined) {
      const clean = optionalText(details);
      if (clean === undefined) {
        return NextResponse.json({ error: "Details is invalid or too long" }, { status: 400 });
      }
      updates.details = clean;
    }

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
