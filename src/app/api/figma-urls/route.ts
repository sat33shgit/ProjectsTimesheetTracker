import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { figmaUrls } from "@/lib/db/schema";
import { eq, sql, and } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const application = searchParams.get("application");
    const search = searchParams.get("search");

    const conditions = [];

    if (application) {
      conditions.push(eq(figmaUrls.application, application));
    }
    if (search) {
      conditions.push(
        sql`(${figmaUrls.application} ILIKE ${"%" + search + "%"} OR ${figmaUrls.details} ILIKE ${"%" + search + "%"})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const urls = await db
      .select()
      .from(figmaUrls)
      .where(whereClause)
      .orderBy(figmaUrls.application);

    return NextResponse.json(urls);
  } catch (error) {
    console.error("Failed to fetch figma urls:", error);
    return NextResponse.json({ error: "Failed to fetch figma urls" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { application, url, details } = body;

    if (!application || !url) {
      return NextResponse.json({ error: "Application and URL are required" }, { status: 400 });
    }

    const urlPattern = /^https?:\/\/(www\.)?figma\.com\/.+/i;
    if (!urlPattern.test(url)) {
      return NextResponse.json({ error: "Please provide a valid Figma URL" }, { status: 400 });
    }

    const [entry] = await db
      .insert(figmaUrls)
      .values({
        application: application.trim(),
        url: url.trim(),
        details: details || null,
      })
      .returning();

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Failed to create figma url:", error);
    return NextResponse.json({ error: "Failed to create figma url" }, { status: 500 });
  }
}
