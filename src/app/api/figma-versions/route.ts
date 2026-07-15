import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { figmaVersions } from "@/lib/db/schema";
import { eq, desc, asc, sql, and, inArray } from "drizzle-orm";
import { parseId, requireString, optionalText, sanitizeSearchTerm } from "@/lib/utils/api-auth";

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
      const term = "%" + sanitizeSearchTerm(search) + "%";
      conditions.push(
        sql`(${figmaVersions.application} ILIKE ${term} OR ${figmaVersions.details} ILIKE ${term})`
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

    const cleanApp = requireString(application, 255);
    const versionNum = Number(version);
    if (cleanApp === null || !Number.isSafeInteger(versionNum) || versionNum <= 0) {
      return NextResponse.json({ error: "Application and a positive integer version are required" }, { status: 400 });
    }
    const cleanDetails = optionalText(details);
    if (cleanDetails === undefined) {
      return NextResponse.json({ error: "Details is invalid or too long" }, { status: 400 });
    }

    const [entry] = await db
      .insert(figmaVersions)
      .values({
        application: cleanApp,
        version: versionNum,
        details: cleanDetails,
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

    const validIds = ids.map((id) => parseId(String(id))).filter((id): id is number => id !== null);
    if (validIds.length === 0) {
      return NextResponse.json({ error: "No valid IDs provided" }, { status: 400 });
    }

    // Single statement instead of one DELETE per id.
    const deleted = await db
      .delete(figmaVersions)
      .where(inArray(figmaVersions.id, validIds))
      .returning({ id: figmaVersions.id });

    return NextResponse.json({ success: true, deleted: deleted.length });
  } catch (error) {
    console.error("Failed to bulk delete figma versions:", error);
    return NextResponse.json({ error: "Failed to delete figma versions" }, { status: 500 });
  }
}
