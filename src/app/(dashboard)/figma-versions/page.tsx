"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FigmaVersionDrawer } from "@/components/figma-versions/figma-version-drawer";
import { TimelineView } from "@/components/figma-versions/timeline-view";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Plus, Search, Pencil, Trash2, Download, LayoutList, GitBranch } from "lucide-react";
import { toast } from "sonner";

interface FigmaVersion {
  id: number;
  application: string;
  version: number;
  details: string | null;
}

export default function FigmaVersionsPage() {
  const [versions, setVersions] = useState<FigmaVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterApp, setFilterApp] = useState("");
  const [view, setView] = useState<"table" | "timeline">("table");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<FigmaVersion | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<FigmaVersion | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterApp) params.set("application", filterApp);
      const res = await fetch(`/api/figma-versions?${params}`);
      const data = await res.json();
      setVersions(data);
    } catch {
      toast.error("Failed to fetch versions");
    } finally {
      setLoading(false);
    }
  }, [search, filterApp]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const applications = useMemo(() => {
    const apps = new Set(versions.map((v) => v.application));
    return Array.from(apps).sort();
  }, [versions]);

  const handleDelete = async () => {
    if (!deleteEntry) return;
    try {
      const res = await fetch(`/api/figma-versions/${deleteEntry.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Version deleted");
      fetchVersions();
    } catch {
      toast.error("Failed to delete version");
    }
    setDeleteEntry(null);
  };

  const handleBulkDelete = async () => {
    try {
      const res = await fetch("/api/figma-versions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Deleted ${selectedIds.size} versions`);
      setSelectedIds(new Set());
      fetchVersions();
    } catch {
      toast.error("Failed to delete versions");
    }
    setBulkDeleteOpen(false);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === versions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(versions.map((v) => v.id)));
    }
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

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Figma Versions</h2>
          <Badge variant="secondary" className="font-mono text-xs">{versions.length} entries</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-9 h-9 w-48"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            value={filterApp}
            onChange={(e) => setFilterApp(e.target.value)}
            aria-label="Filter by application"
          >
            <option value="">All Applications</option>
            {applications.map((app) => (
              <option key={app} value={app}>{app}</option>
            ))}
          </select>
          <Button size="sm" onClick={() => { setEditEntry(null); setDrawerOpen(true); }}>
            <Plus className="size-4 mr-1" /> Add Version
          </Button>
          <Button size="sm" variant="ghost" onClick={handleExport} aria-label="Export">
            <Download className="size-4" />
          </Button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <Tabs value={view} onValueChange={(v: string) => setView(v as "table" | "timeline")}>
          <TabsList>
            <TabsTrigger value="table" className="gap-1"><LayoutList className="size-3.5" /> Table</TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1"><GitBranch className="size-3.5" /> Timeline</TabsTrigger>
          </TabsList>
        </Tabs>
        {selectedIds.size > 0 && (
          <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 className="size-4 mr-1" /> Delete {selectedIds.size} Selected
          </Button>
        )}
      </div>

      {/* Content */}
      {view === "table" ? (
        <div className="rounded-xl border border-zinc-100 shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/50">
                <TableHead className="w-10">
                  <Checkbox
                    checked={versions.length > 0 && selectedIds.size === versions.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Application</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(5)].map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : versions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    No Figma versions found. Click &quot;Add Version&quot; to get started.
                  </TableCell>
                </TableRow>
              ) : (
                versions.map((v, i) => (
                  <TableRow key={v.id} className={i % 2 === 1 ? "bg-zinc-50/50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(v.id)}
                        onCheckedChange={() => toggleSelect(v.id)}
                        aria-label={`Select ${v.application} v${v.version}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{v.application}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">v{v.version}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      {v.details ? (
                        <span className="text-muted-foreground truncate block">
                          {v.details.length > 80 ? v.details.slice(0, 80) + "..." : v.details}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditEntry(v); setDrawerOpen(true); }} aria-label="Edit version">
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteEntry(v)} aria-label="Delete version">
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : (
          <TimelineView versions={versions} />
        )
      )}

      {/* Drawers/Dialogs */}
      <FigmaVersionDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        entry={editEntry}
        applications={applications}
        onSaved={fetchVersions}
      />

      <ConfirmDialog
        open={!!deleteEntry}
        onOpenChange={(open) => !open && setDeleteEntry(null)}
        title="Delete Version"
        description={
          deleteEntry
            ? `Delete ${deleteEntry.application} v${deleteEntry.version}? This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        onConfirm={handleDelete}
        destructive
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Delete Selected Versions"
        description={`Are you sure you want to delete ${selectedIds.size} selected versions? This action cannot be undone.`}
        confirmLabel="Delete All"
        onConfirm={handleBulkDelete}
        destructive
      />
    </div>
  );
}
