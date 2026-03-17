import { db } from "@/lib/db";
import { projects, timesheetEntries, figmaVersions, figmaUrls } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { ImportPreview } from "@/lib/utils/excel";

export async function POST(request: Request) {
  try {
    const body: { preview: ImportPreview; mode: "skip" | "replace" } = await request.json();
    const { preview, mode } = body;
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

          if (percentage === lastPercentage) {
            return;
          }

          lastPercentage = percentage;
          sendEvent({ type: "progress", percentage, stage });
        };

        const advanceProgress = (stage: string) => {
          processedRows += 1;
          sendProgress(stage);
        };

        const processImport = async () => {
          let timesheetImported = 0;
          let figmaVersionsImported = 0;
          let figmaUrlsImported = 0;

          async function getOrCreateProjectId(name: string): Promise<number> {
            const trimmed = name.trim();
            const existing = await db
              .select()
              .from(projects)
              .where(eq(projects.name, trimmed))
              .limit(1);

            if (existing.length > 0) return existing[0].id;

            const [created] = await db
              .insert(projects)
              .values({ name: trimmed })
              .returning();
            return created.id;
          }

          sendEvent({ type: "progress", percentage: 0, stage: "Starting import" });

          for (const row of preview.timesheet) {
            try {
              if (!row.projectName || !row.date || !row.hours) continue;

              const projectId = await getOrCreateProjectId(row.projectName);
              const date = new Date(row.date);

              if (isNaN(date.getTime())) continue;
              if (date.getFullYear() < 2000 || date.getFullYear() > 2100) continue;

              const existing = await db
                .select()
                .from(timesheetEntries)
                .where(
                  and(
                    eq(timesheetEntries.projectId, projectId),
                    eq(timesheetEntries.date, date),
                    eq(timesheetEntries.hours, String(row.hours))
                  )
                )
                .limit(1);

              if (existing.length > 0) {
                if (mode === "replace") {
                  await db
                    .update(timesheetEntries)
                    .set({
                      details: row.details || null,
                      updatedAt: new Date(),
                    })
                    .where(eq(timesheetEntries.id, existing[0].id));
                  timesheetImported++;
                }
              } else {
                await db.insert(timesheetEntries).values({
                  projectId,
                  date,
                  hours: String(row.hours),
                  details: row.details || null,
                });
                timesheetImported++;
              }
            } finally {
              advanceProgress("Importing timesheet entries");
            }
          }

          for (const row of preview.figmaVersions) {
            try {
              if (!row.application || !row.version) continue;

              const existing = await db
                .select()
                .from(figmaVersions)
                .where(
                  and(
                    eq(figmaVersions.application, row.application.trim()),
                    eq(figmaVersions.version, row.version)
                  )
                )
                .limit(1);

              if (existing.length > 0) {
                if (mode === "replace") {
                  await db
                    .update(figmaVersions)
                    .set({
                      details: row.details || null,
                      updatedAt: new Date(),
                    })
                    .where(eq(figmaVersions.id, existing[0].id));
                  figmaVersionsImported++;
                }
              } else {
                await db.insert(figmaVersions).values({
                  application: row.application.trim(),
                  version: row.version,
                  details: row.details || null,
                });
                figmaVersionsImported++;
              }
            } finally {
              advanceProgress("Importing Figma versions");
            }
          }

          for (const row of preview.figmaUrls) {
            try {
              if (!row.application || !row.url) continue;

              await db.insert(figmaUrls).values({
                application: row.application.trim(),
                url: row.url.trim(),
                details: row.details || null,
              });
              figmaUrlsImported++;
            } finally {
              advanceProgress("Importing Figma URLs");
            }
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
