import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { figmaVersions } from "@/lib/db/schema";
import { eq, desc, asc, sql, and } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const application = searchParams.get("application");
    const search = searchParams.get("search");

    const conditions = [];

    if (application) {
      conditions.push(eq(figmaVersions.application, application));
    }
    if (search) {
      conditions.push(
        sql`(${figmaVersions.application} ILIKE ${"%" + search + "%"} OR ${figmaVersions.details} ILIKE ${"%" + search + "%"})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const versions = await db
      .select()
      .from(figmaVersions)
      .where(whereClause)
      .orderBy(asc(figmaVersions.application), desc(figmaVersions.version));

    return NextResponse.json(versions);
  } catch (error) {
    console.error("Failed to fetch figma versions:", error);
    return NextResponse.json({ error: "Failed to fetch figma versions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { application, version, details } = body;

    if (!application || !version) {
      return NextResponse.json({ error: "Application and version are required" }, { status: 400 });
    }

    const [entry] = await db
      .insert(figmaVersions)
      .values({
        application: application.trim(),
        version: Number(version),
        details: details || null,
      })
      .returning();

    return NextResponse.json(entry, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("unique") || message.includes("duplicate")) {
      return NextResponse.json({ error: "This version already exists for this application" }, { status: 409 });
    }
    console.error("Failed to create figma version:", error);
    return NextResponse.json({ error: "Failed to create figma version" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "IDs array is required" }, { status: 400 });
    }

    for (const id of ids) {
      await db.delete(figmaVersions).where(eq(figmaVersions.id, Number(id)));
    }

    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (error) {
    console.error("Failed to bulk delete figma versions:", error);
    return NextResponse.json({ error: "Failed to delete figma versions" }, { status: 500 });
  }
}
