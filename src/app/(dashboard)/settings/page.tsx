"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { ImportPreview } from "@/lib/utils/excel";
import { Plus, Pencil, Trash2, Download, Upload, AlertTriangle, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Project {
  id: number;
  name: string;
  isActive: boolean;
}

interface ImportPreviewData {
  timesheetCount: number;
  figmaVersionsCount: number;
  figmaUrlsCount: number;
  preview: ImportPreview;
}

interface ImportResult {
  imported: {
    timesheet: number;
    figmaVersions: number;
    figmaUrls: number;
  };
  mode: "skip" | "replace";
}

interface ImportProgressEvent {
  type: "progress";
  percentage: number;
  stage: string;
}

interface ImportCompleteEvent {
  type: "complete";
  percentage: number;
  stage: string;
  imported: ImportResult["imported"];
}

interface ImportErrorEvent {
  type: "error";
  message: string;
}

type ImportStreamEvent = ImportProgressEvent | ImportCompleteEvent | ImportErrorEvent;

interface BillingSettings {
  hourly_rate_cad: string;
  conversion_rate_inr: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<BillingSettings>({ hourly_rate_cad: "10", conversion_rate_inr: "60" });
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreviewData | null>(null);
  const [importMode, setImportMode] = useState<"skip" | "replace">("skip");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStage, setImportStage] = useState("Preparing import");
  const [lastImportResult, setLastImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importResultRef = useRef<HTMLDivElement>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setSettings({
        hourly_rate_cad: data.hourly_rate_cad ?? "10",
        conversion_rate_inr: data.conversion_rate_inr ?? "60",
      });
    } catch {}
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      setProjects(data);
    } catch {}
  }, []);

  useEffect(() => {
    Promise.all([fetchSettings(), fetchProjects()]).then(() => setLoading(false));
  }, [fetchSettings, fetchProjects]);

  useEffect(() => {
    if (!lastImportResult) return;
    importResultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [lastImportResult]);

  const saveSetting = async (key: string, value: string) => {
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      setSettings((prev) => ({ ...prev, [key]: value }));
      toast.success("Setting saved");
    } catch {
      toast.error("Failed to save setting");
    }
  };

  const addProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success("Project added");
      setNewProjectName("");
      fetchProjects();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add project");
    }
  };

  const updateProject = async (id: number, updates: Partial<{ name: string; isActive: boolean }>) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success("Project updated");
      setEditingId(null);
      fetchProjects();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update project");
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteProject) return;
    try {
      const res = await fetch(`/api/projects/${deleteProject.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Project deleted");
      fetchProjects();
    } catch {
      toast.error("Failed to delete project");
    }
    setDeleteProject(null);
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ProjectsTimesheet_Export.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch {
      toast.error("Failed to export");
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/import", { method: "POST", body: formData });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setImportPreview(data);
      setLastImportResult(null);
    } catch {
      toast.error("Failed to parse file");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const confirmImport = async () => {
    if (!importPreview || importing) return;
    setImporting(true);
    setImportProgress(0);
    setImportStage("Preparing import");
    const toastId = toast.loading("Importing data... 0%");
    try {
      const res = await fetch("/api/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preview: importPreview.preview, mode: importMode }),
      });
      if (!res.ok) throw new Error();

      if (!res.body) throw new Error();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let imported: ImportResult["imported"] | null = null;

      const handleEvent = (event: ImportStreamEvent) => {
        if (event.type === "progress") {
          setImportProgress(event.percentage);
          setImportStage(event.stage);
          toast.loading(`${event.stage}... ${event.percentage}%`, { id: toastId });
          return;
        }

        if (event.type === "complete") {
          imported = event.imported;
          setImportProgress(event.percentage);
          setImportStage(event.stage);
          toast.success(`${event.stage} ${event.percentage}%`, { id: toastId });
          return;
        }

        throw new Error(event.message);
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          handleEvent(JSON.parse(line) as ImportStreamEvent);
        }
      }

      if (buffer.trim()) {
        handleEvent(JSON.parse(buffer) as ImportStreamEvent);
      }

      if (!imported) throw new Error();

      setLastImportResult({ imported, mode: importMode });
      setImportPreview(null);
      setImportMode("skip");
      fetchProjects();
    } catch {
      toast.error("Failed to import", { id: toastId });
    } finally {
      setImportProgress(0);
      setImportStage("Preparing import");
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Billing Settings */}
      <Card className="rounded-xl border border-zinc-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Billing Settings</CardTitle>
          <CardDescription>Configure your hourly rate and currency conversion</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Hourly Rate (CAD)</Label>
              <Input
                id="hourlyRate"
                type="number"
                step="0.5"
                min="0"
                value={settings.hourly_rate_cad}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, hourly_rate_cad: e.target.value }))
                }
                onBlur={(e) => saveSetting("hourly_rate_cad", e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="convRate">CAD → INR Conversion Rate</Label>
              <Input
                id="convRate"
                type="number"
                step="0.1"
                min="0"
                value={settings.conversion_rate_inr}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, conversion_rate_inr: e.target.value }))
                }
                onBlur={(e) => saveSetting("conversion_rate_inr", e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Changes reflect immediately on the Dashboard.</p>
        </CardContent>
      </Card>

      {/* Projects Manager */}
      <Card className="rounded-xl border border-zinc-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Projects Manager</CardTitle>
          <CardDescription>Manage all your projects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50/50">
                  <TableHead>Project Name</TableHead>
                  <TableHead className="w-24">Active</TableHead>
                  <TableHead className="text-right w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p, i) => (
                  <TableRow key={p.id} className={i % 2 === 1 ? "bg-zinc-50/50" : ""}>
                    <TableCell>
                      {editingId === p.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="h-8 text-sm"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") updateProject(p.id, { name: editingName });
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            autoFocus
                          />
                          <Button variant="ghost" size="sm" onClick={() => updateProject(p.id, { name: editingName })} aria-label="Save">
                            <Check className="size-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} aria-label="Cancel">
                            <X className="size-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="font-medium">{p.name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={p.isActive}
                        onCheckedChange={(checked: boolean) => updateProject(p.id, { isActive: checked })}
                        aria-label={`Toggle ${p.name} active status`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditingId(p.id); setEditingName(p.name); }}
                          aria-label="Rename project"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteProject(p)}
                          aria-label="Delete project"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Quick Add Row */}
                <TableRow>
                  <TableCell colSpan={3}>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="New project name..."
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        className="h-8 text-sm flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addProject();
                        }}
                      />
                      <Button size="sm" onClick={addProject} disabled={!newProjectName.trim()}>
                        <Plus className="size-4 mr-1" /> Add
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="relative rounded-xl border border-zinc-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Data Management</CardTitle>
          <CardDescription>Import, export, or reset your data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4" aria-busy={importing}>
          {importing && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-[1px]">
              <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-muted-foreground shadow-sm">
                <Loader2 className="size-4 animate-spin" />
                {importStage}... {importProgress}%. Data management is temporarily disabled.
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleExport} disabled={importing}>
              <Download className="size-4 mr-2" /> Export All Data
            </Button>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportFile}
                disabled={importing}
                className="hidden"
                id="import-file"
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                <Upload className="size-4 mr-2" /> Import Data
              </Button>
            </div>
          </div>

          {/* Import Preview */}
          {importPreview && (
            <Card className="bg-zinc-50">
              <CardContent className="p-4 space-y-3">
                <h4 className="font-semibold text-sm">Import Preview</h4>
                <div className="space-y-1 text-sm">
                  <p>Timesheet entries: <strong>{importPreview.timesheetCount}</strong></p>
                  <p>Figma Versions: <strong>{importPreview.figmaVersionsCount}</strong></p>
                  <p>Figma URLs: <strong>{importPreview.figmaUrlsCount}</strong></p>
                </div>
                <div className="flex items-center gap-4">
                  <Label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === "skip"}
                      onChange={() => setImportMode("skip")}
                      disabled={importing}
                    />
                    Skip duplicates
                  </Label>
                  <Label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === "replace"}
                      onChange={() => setImportMode("replace")}
                      disabled={importing}
                    />
                    Replace existing
                  </Label>
                </div>
                {importing && (
                  <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    {importStage}... {importProgress}%
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" onClick={confirmImport} disabled={importing}>
                    {importing ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        {importProgress}%
                      </>
                    ) : (
                      "Confirm Import"
                    )}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setImportPreview(null)} disabled={importing}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {lastImportResult && !importPreview && (
            <div ref={importResultRef}>
            <Card className="border border-emerald-300 bg-emerald-50 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700">
                  <Check className="size-4" />
                  <h4 className="font-semibold text-sm">Import Complete</h4>
                </div>
                <p className="text-sm text-emerald-800">
                  Import finished in {lastImportResult.mode === "replace" ? "replace" : "skip duplicates"} mode.
                </p>
                <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                  <div className="rounded-md border border-emerald-200 bg-white px-3 py-2">
                    <div className="text-muted-foreground">Timesheet</div>
                    <div className="font-semibold">{lastImportResult.imported.timesheet}</div>
                  </div>
                  <div className="rounded-md border border-emerald-200 bg-white px-3 py-2">
                    <div className="text-muted-foreground">Figma Versions</div>
                    <div className="font-semibold">{lastImportResult.imported.figmaVersions}</div>
                  </div>
                  <div className="rounded-md border border-emerald-200 bg-white px-3 py-2">
                    <div className="text-muted-foreground">Figma URLs</div>
                    <div className="font-semibold">{lastImportResult.imported.figmaUrls}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>
          )}

          <Separator />

          {/* Danger Zone */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4" />
              <h4 className="font-semibold text-sm">Danger Zone</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              This will permanently delete all data. Type <strong>DELETE</strong> to confirm.
            </p>
            <div className="flex items-center gap-2">
              <Input
                placeholder='Type "DELETE" to confirm'
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                className="w-48 h-8 text-sm"
              />
              <Button
                variant="destructive"
                size="sm"
                disabled={importing || resetConfirmText !== "DELETE"}
                onClick={() => setResetOpen(true)}
              >
                Reset All Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ConfirmDialog
        open={!!deleteProject}
        onOpenChange={(open) => !open && setDeleteProject(null)}
        title="Delete Project"
        description={
          deleteProject
            ? `Delete "${deleteProject.name}"? All associated timesheet entries will also be deleted. This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        onConfirm={handleDeleteProject}
        destructive
      />

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset All Data"
        description="This will permanently delete ALL projects, timesheet entries, Figma versions, Figma URLs, and settings. This cannot be undone."
        confirmLabel="Reset Everything"
        onConfirm={async () => {
          try {
            const res = await fetch("/api/reset", { method: "DELETE" });
            if (!res.ok) throw new Error();
            toast.success("All data has been reset");
            fetchProjects();
            fetchSettings();
          } catch {
            toast.error("Failed to reset data");
          }
          setResetOpen(false);
          setResetConfirmText("");
        }}
        destructive
      />
    </div>
  );
}
