import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";

// Only these keys may be written via the API — prevents arbitrary
// key/value rows being inserted into the settings table.
const ALLOWED_SETTING_KEYS = new Set(["hourly_rate_cad", "conversion_rate_inr"]);

export async function GET() {
  try {
    const allSettings = await db.select().from(settings);
    const settingsMap: Record<string, string> = {};
    for (const s of allSettings) {
      settingsMap[s.key] = s.value;
    }

    // Ensure defaults exist
    if (!settingsMap["hourly_rate_cad"]) settingsMap["hourly_rate_cad"] = "10";
    if (!settingsMap["conversion_rate_inr"]) settingsMap["conversion_rate_inr"] = "60";

    return NextResponse.json(settingsMap);
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    for (const [key, value] of Object.entries(body)) {
      if (typeof key !== "string" || typeof value !== "string") continue;
      if (!ALLOWED_SETTING_KEYS.has(key)) continue;
      const num = Number(value);
      if (!Number.isFinite(num) || num < 0 || num > 1_000_000) continue;

      // Atomic upsert — one statement instead of select-then-insert/update,
      // which also avoids a race between concurrent requests.
      await db
        .insert(settings)
        .values({ key, value })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value, updatedAt: new Date() },
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
