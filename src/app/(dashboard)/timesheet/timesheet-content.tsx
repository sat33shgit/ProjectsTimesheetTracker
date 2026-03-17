"use client";

import { Fragment, useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
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
import { Skeleton } from "@/components/ui/skeleton";
import { LogTimeDrawer } from "@/components/timesheet/log-time-drawer";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Plus, Search, Pencil, Trash2, Download, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/lib/utils/format";

interface Project {
  id: number;
  name: string;
}

interface TimesheetEntry {
  id: number;
  projectId: number;
  projectName: string;
  date: string;
  hours: string;
  details: string | null;
}

interface GroupedEntries {
  projectId: number;
  projectName: string;
  totalHours: number;
  entries: TimesheetEntry[];
}

export default function TimesheetContent() {
  const searchParams = useSearchParams();
  const presetProjectId = searchParams.get("projectId");

  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterProjectId, setFilterProjectId] = useState(presetProjectId || "");
  const [collapsedProjects, setCollapsedProjects] = useState<Record<number, boolean>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<TimesheetEntry | null>(null);
  const [initialProjectId, setInitialProjectId] = useState<string | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<TimesheetEntry | null>(null);
  const [settings, setSettings] = useState({ hourly_rate_cad: "10", conversion_rate_inr: "60" });

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("all", "true");
      if (search) params.set("search", search);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (filterProjectId) params.set("projectId", filterProjectId);

      const res = await fetch(`/api/timesheet?${params}`);
      const data = await res.json();
      setEntries(data.entries || []);
      setTotal(data.total || 0);
      setTotalHours(data.totalHours || 0);
    } catch {
      toast.error("Failed to fetch timesheet");
    } finally {
      setLoading(false);
    }
  }, [search, dateFrom, dateTo, filterProjectId]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      setProjects(data);
    } catch {}
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setSettings(data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchSettings();
  }, [fetchProjects, fetchSettings]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const groupedEntries = useMemo<GroupedEntries[]>(() => {
    const groups = new Map<number, GroupedEntries>();

    entries.forEach((entry) => {
      const existing = groups.get(entry.projectId);
      if (existing) {
        existing.entries.push(entry);
        existing.totalHours += Number(entry.hours);
        return;
      }

      groups.set(entry.projectId, {
        projectId: entry.projectId,
        projectName: entry.projectName,
        totalHours: Number(entry.hours),
        entries: [entry],
      });
    });

    return Array.from(groups.values());
  }, [entries]);

  useEffect(() => {
    setCollapsedProjects((prev) => {
      const next = { ...prev };
      let changed = false;

      groupedEntries.forEach((group) => {
        if (next[group.projectId] === undefined) {
          next[group.projectId] = true;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [groupedEntries]);

  // Keyboard shortcut: N to open log time
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "n" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
        e.preventDefault();
        setEditEntry(null);
        setDrawerOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleDelete = async () => {
    if (!deleteEntry) return;
    try {
      const res = await fetch(`/api/timesheet/${deleteEntry.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Entry deleted");
      fetchEntries();
    } catch {
      toast.error("Failed to delete entry");
    }
    setDeleteEntry(null);
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

  const hourlyRate = Number(settings.hourly_rate_cad);
  const conversionRate = Number(settings.conversion_rate_inr);
  const totalCAD = totalHours * hourlyRate;
  const totalINR = totalCAD * conversionRate;

  const toggleProjectCollapse = (projectId: number) => {
    setCollapsedProjects((prev) => {
      const wasCollapsed = prev[projectId] ?? true;
      // Collapse all groups first, then expand only the clicked one (if it was collapsed)
      const next: Record<number, boolean> = {};
      for (const key of Object.keys(prev)) {
        next[Number(key)] = true;
      }
      if (wasCollapsed) {
        next[projectId] = false;
      }
      return next;
    });
  };

  useEffect(() => {
    if (!drawerOpen) setInitialProjectId(null);
  }, [drawerOpen]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Timesheet</h2>
          <Badge variant="secondary" className="font-mono text-xs">{total} entries</Badge>
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
          <Input
            type="date"
            className="h-9 w-36"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="Date from"
          />
          <Input
            type="date"
            className="h-9 w-36"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="Date to"
          />
          <select
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            value={filterProjectId}
            onChange={(e) => setFilterProjectId(e.target.value)}
            aria-label="Filter by project"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={String(p.id)}>{p.name}</option>
            ))}
          </select>
          <Button size="sm" onClick={() => { setEditEntry(null); setInitialProjectId(null); setDrawerOpen(true); }}>
            <Plus className="size-4 mr-1" /> Log Time
          </Button>
          <Button size="sm" variant="ghost" onClick={handleExport} aria-label="Export Excel">
            <Download className="size-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-100 shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50/50">
              <TableHead className="w-10">#</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(6)].map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  No timesheet entries found. Click &quot;Log Time&quot; to get started.
                </TableCell>
              </TableRow>
            ) : (
              groupedEntries.map((group) => {
                const isCollapsed = collapsedProjects[group.projectId] ?? false;

                return (
                  <Fragment key={`group-wrap-${group.projectId}`}>
                    <TableRow key={`group-${group.projectId}`} className="bg-zinc-100/70">
                      <TableCell colSpan={6}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleProjectCollapse(group.projectId)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleProjectCollapse(group.projectId); } }}
                          className="flex w-full items-center justify-between gap-3 text-left"
                          aria-expanded={!isCollapsed}
                          aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${group.projectName} group`}
                        >
                          <div className="flex items-center gap-2">
                            {isCollapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
                            <span className="font-semibold">{group.projectName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditEntry(null);
                                setInitialProjectId(String(group.projectId));
                                setDrawerOpen(true);
                              }}
                              aria-label={`Add entry to ${group.projectName}`}
                            >
                              <Plus className="size-4" />
                            </Button>
                            <span className="text-sm text-muted-foreground font-mono">
                              {group.entries.length} entries | {group.totalHours.toFixed(2)} hrs
                            </span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                    {!isCollapsed && group.entries.map((entry, i) => {
                      return (
                        <TableRow key={entry.id} className={i % 2 === 1 ? "bg-zinc-50/40" : ""}>
                          <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                          <TableCell className="font-medium">{entry.projectName}</TableCell>
                          <TableCell>{formatDate(entry.date)}</TableCell>
                          <TableCell className="text-right font-mono">{Number(entry.hours).toFixed(2)} hrs</TableCell>
                          <TableCell className="max-w-[200px] truncate text-muted-foreground">
                            {entry.details || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setEditEntry(entry); setDrawerOpen(true); }}
                                aria-label="Edit entry"
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteEntry(entry)}
                                aria-label="Delete entry"
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary Bar */}
      <div className="sticky bottom-0 md:bottom-0 bg-white border-t border-border -mx-4 sm:-mx-6 px-4 sm:px-6 py-3">
        <p className="text-sm text-muted-foreground">
          Showing <strong>{total}</strong> entries — <strong className="font-mono">{totalHours.toFixed(2)} hours</strong> | <strong className="font-mono">{formatCurrency(totalCAD, "CAD")}</strong> | <strong className="font-mono">{formatCurrency(totalINR, "INR")}</strong>
        </p>
      </div>

      {/* Drawer */}
      <LogTimeDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        entry={editEntry}
        projects={projects}
        onSaved={fetchEntries}
        initialProjectId={initialProjectId}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteEntry}
        onOpenChange={(open) => !open && setDeleteEntry(null)}
        title="Delete Entry"
        description={
          deleteEntry
            ? `Are you sure you want to delete this entry? ${deleteEntry.projectName} — ${formatDate(deleteEntry.date)} — ${Number(deleteEntry.hours).toFixed(2)} hrs. This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        onConfirm={handleDelete}
        destructive
      />
    </div>
  );
}
