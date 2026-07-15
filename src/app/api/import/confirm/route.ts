import { db } from "@/lib/db";
import { projects, timesheetEntries, figmaVersions, figmaUrls } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { ImportPreview, TimesheetRow, FigmaVersionRow, FigmaUrlRow } from "@/lib/utils/excel";

// Caps to prevent memory/DB exhaustion from an oversized or hostile payload.
const MAX_TOTAL_ROWS = 30_000;
const MAX_TEXT = 10_000;
const MAX_NAME = 255;
const INSERT_CHUNK = 250;

function cleanStr(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/**
 * Re-validates the client-supplied preview payload. The preview travels
 * through the browser between /api/import and /api/import/confirm, so it
 * must be treated as untrusted input.
 */
function validatePreview(raw: unknown): ImportPreview | null {
  if (typeof raw !== "object" || raw === null) return null;
  const p = raw as Record<string, unknown>;
  const ts = Array.isArray(p.timesheet) ? p.timesheet : [];
  const fv = Array.isArray(p.figmaVersions) ? p.figmaVersions : [];
  const fu = Array.isArray(p.figmaUrls) ? p.figmaUrls : [];

  if (ts.length + fv.length + fu.length > MAX_TOTAL_ROWS) return null;

  const timesheet: TimesheetRow[] = [];
  for (const row of ts) {
    if (typeof row !== "object" || row === null) continue;
    const r = row as Record<string, unknown>;
    const projectName = cleanStr(r.projectName, MAX_NAME);
    const date = cleanStr(r.date, 10);
    const hours = Number(r.hours);
    if (!projectName || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) continue;
    timesheet.push({
      projectName,
      date,
      hours,
      subcategory: cleanStr(r.subcategory, MAX_NAME),
      details: cleanStr(r.details, MAX_TEXT),
    });
  }

  const versions: FigmaVersionRow[] = [];
  for (const row of fv) {
    if (typeof row !== "object" || row === null) continue;
    const r = row as Record<string, unknown>;
    const application = cleanStr(r.application, MAX_NAME);
    const version = Number(r.version);
    if (!application || !Number.isSafeInteger(version) || version <= 0) continue;
    versions.push({ application, version, details: cleanStr(r.details, MAX_TEXT) });
  }

  const urls: FigmaUrlRow[] = [];
  for (const row of fu) {
    if (typeof row !== "object" || row === null) continue;
    const r = row as Record<string, unknown>;
    const application = cleanStr(r.application, MAX_NAME);
    const url = cleanStr(r.url, 2048);
    if (!application || !url) continue;
    urls.push({ application, url, details: cleanStr(r.details, MAX_TEXT) });
  }

  return { timesheet, figmaVersions: versions, figmaUrls: urls };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const mode: "skip" | "replace" = body?.mode === "replace" ? "replace" : "skip";
    const preview = validatePreview(body?.preview);

    if (!preview) {
      return new Response(JSON.stringify({ error: "Invalid or oversized import payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    const totalRows = preview.timesheet.length + preview.figmaVersions.length + preview.figmaUrls.length;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const sendEvent = (event: unknown) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };

        let processedRows = 0;
        let lastPercentage = -1;

        const sendProgress = (stage: string) => {
          const percentage = totalRows === 0
            ? 100
            : Math.min(99, Math.round((processedRows / totalRows) * 100));

          if (percentage === lastPercentage) return;

          lastPercentage = percentage;
          sendEvent({ type: "progress", percentage, stage });
        };

        const processImport = async () => {
          let timesheetImported = 0;
          let figmaVersionsImported = 0;
          let figmaUrlsImported = 0;

          sendEvent({ type: "progress", percentage: 0, stage: "Starting import" });

          // --- Prefetch lookups once instead of per-row queries (avoids N+1) ---

          // Project name -> id cache
          const projectCache = new Map<string, number>();
          for (const p of await db.select({ id: projects.id, name: projects.name }).from(projects)) {
            projectCache.set(p.name, p.id);
          }

          const getOrCreateProjectId = async (name: string): Promise<number> => {
            const cached = projectCache.get(name);
            if (cached !== undefined) return cached;
            const [created] = await db.insert(projects).values({ name }).returning();
            projectCache.set(name, created.id);
            return created.id;
          };

          // Existing timesheet (projectId|dateISO|hours) -> entry id
          const existingTimesheet = new Map<string, number>();
          for (const e of await db
            .select({ id: timesheetEntries.id, projectId: timesheetEntries.projectId, date: timesheetEntries.date, hours: timesheetEntries.hours })
            .from(timesheetEntries)) {
            existingTimesheet.set(`${e.projectId}|${e.date.toISOString().slice(0, 10)}|${Number(e.hours)}`, e.id);
          }

          // Existing figma versions (application|version) -> id
          const existingVersions = new Map<string, number>();
          for (const v of await db
            .select({ id: figmaVersions.id, application: figmaVersions.application, version: figmaVersions.version })
            .from(figmaVersions)) {
            existingVersions.set(`${v.application}|${v.version}`, v.id);
          }

          // --- Timesheet ---
          const timesheetInserts: (typeof timesheetEntries.$inferInsert)[] = [];
          for (const row of preview.timesheet) {
            const projectId = await getOrCreateProjectId(row.projectName);
            const date = new Date(row.date + "T00:00:00Z");
            if (isNaN(date.getTime()) || date.getUTCFullYear() < 2000 || date.getUTCFullYear() > 2100) {
              processedRows++;
              continue;
            }

            const key = `${projectId}|${row.date}|${row.hours}`;
            const existingId = existingTimesheet.get(key);

            if (existingId !== undefined) {
              if (mode === "replace") {
                await db
                  .update(timesheetEntries)
                  .set({
                    subcategory: row.subcategory || null,
                    details: row.details || null,
                    updatedAt: new Date(),
                  })
                  .where(eq(timesheetEntries.id, existingId));
                timesheetImported++;
              }
            } else {
              timesheetInserts.push({
                projectId,
                date,
                hours: String(row.hours),
                subcategory: row.subcategory || null,
                details: row.details || null,
              });
              existingTimesheet.set(key, -1); // avoid duplicate inserts within the same file
              timesheetImported++;
            }
            processedRows++;
            sendProgress("Importing timesheet entries");
          }
          for (let i = 0; i < timesheetInserts.length; i += INSERT_CHUNK) {
            await db.insert(timesheetEntries).values(timesheetInserts.slice(i, i + INSERT_CHUNK));
          }

          // --- Figma versions ---
          const versionInserts: (typeof figmaVersions.$inferInsert)[] = [];
          for (const row of preview.figmaVersions) {
            const key = `${row.application}|${row.version}`;
            const existingId = existingVersions.get(key);

            if (existingId !== undefined) {
              if (mode === "replace" && existingId > 0) {
                await db
                  .update(figmaVersions)
                  .set({ details: row.details || null, updatedAt: new Date() })
                  .where(eq(figmaVersions.id, existingId));
                figmaVersionsImported++;
              }
            } else {
              versionInserts.push({
                application: row.application,
                version: row.version,
                details: row.details || null,
              });
              existingVersions.set(key, -1);
              figmaVersionsImported++;
            }
            processedRows++;
            sendProgress("Importing Figma versions");
          }
          for (let i = 0; i < versionInserts.length; i += INSERT_CHUNK) {
            await db.insert(figmaVersions).values(versionInserts.slice(i, i + INSERT_CHUNK));
          }

          // --- Figma URLs (batched inserts) ---
          const urlInserts = preview.figmaUrls.map((row) => ({
            application: row.application,
            url: row.url,
            details: row.details || null,
          }));
          for (let i = 0; i < urlInserts.length; i += INSERT_CHUNK) {
            await db.insert(figmaUrls).values(urlInserts.slice(i, i + INSERT_CHUNK));
            processedRows += Math.min(INSERT_CHUNK, urlInserts.length - i);
            figmaUrlsImported += Math.min(INSERT_CHUNK, urlInserts.length - i);
            sendProgress("Importing Figma URLs");
          }

          sendEvent({
            type: "complete",
            percentage: 100,
            stage: "Import complete",
            imported: {
              timesheet: timesheetImported,
              figmaVersions: figmaVersionsImported,
              figmaUrls: figmaUrlsImported,
            },
          });
          controller.close();
        };

        void processImport().catch((error) => {
          console.error("Failed to confirm import:", error);
          sendEvent({ type: "error", message: "Failed to import data" });
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error) {
    console.error("Failed to confirm import:", error);
    return new Response(JSON.stringify({ error: "Failed to import data" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
