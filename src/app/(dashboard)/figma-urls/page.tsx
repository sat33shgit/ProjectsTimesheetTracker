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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FigmaUrlDrawer } from "@/components/figma-urls/figma-url-drawer";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Plus, Search, Pencil, Trash2, Download, ExternalLink, LayoutGrid, LayoutList } from "lucide-react";
import { toast } from "sonner";

interface FigmaUrl {
  id: number;
  application: string;
  url: string;
  details: string | null;
}

export default function FigmaUrlsPage() {
  const [urls, setUrls] = useState<FigmaUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<FigmaUrl | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<FigmaUrl | null>(null);

  const fetchUrls = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/figma-urls?${params}`);
      const data = await res.json();
      setUrls(data);
    } catch {
      toast.error("Failed to fetch URLs");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchUrls();
  }, [fetchUrls]);

  const applications = useMemo(() => {
    const apps = new Set(urls.map((u) => u.application));
    return Array.from(apps).sort();
  }, [urls]);

  const handleDelete = async () => {
    if (!deleteEntry) return;
    try {
      const res = await fetch(`/api/figma-urls/${deleteEntry.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("URL deleted");
      fetchUrls();
    } catch {
      toast.error("Failed to delete URL");
    }
    setDeleteEntry(null);
  };

  const truncateUrl = (url: string) => {
    try {
      const u = new URL(url);
      const path = u.pathname.length > 30 ? u.pathname.slice(0, 30) + "..." : u.pathname;
      return u.hostname + path;
    } catch {
      return url.length > 40 ? url.slice(0, 40) + "..." : url;
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
          <h2 className="text-lg font-semibold">Figma URLs</h2>
          <Badge variant="secondary" className="font-mono text-xs">{urls.length} entries</Badge>
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
          <Button size="sm" onClick={() => { setEditEntry(null); setDrawerOpen(true); }}>
            <Plus className="size-4 mr-1" /> Add URL
          </Button>
          <Button size="sm" variant="ghost" onClick={handleExport} aria-label="Export">
            <Download className="size-4" />
          </Button>
        </div>
      </div>

      {/* View Toggle */}
      <Tabs value={view} onValueChange={(v: string) => setView(v as "grid" | "table")}>
        <TabsList>
          <TabsTrigger value="grid" className="gap-1"><LayoutGrid className="size-3.5" /> Cards</TabsTrigger>
          <TabsTrigger value="table" className="gap-1"><LayoutList className="size-3.5" /> Table</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : view === "grid" ? (
        urls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
            <p className="text-lg font-medium">No Figma URLs</p>
            <p className="text-sm mt-1">Click &quot;Add URL&quot; to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {urls.map((u) => (
              <Card key={u.id} className="rounded-xl shadow-sm border border-zinc-100 hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">{u.application}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Tooltip>
                    <TooltipTrigger>
                      <a
                        href={u.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-accent hover:underline truncate"
                      >
                        <ExternalLink className="size-3.5 shrink-0" />
                        {truncateUrl(u.url)}
                      </a>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm break-all">{u.url}</TooltipContent>
                  </Tooltip>
                  {u.details && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{u.details}</p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={u.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="size-3" /> Open in Figma
                    </a>
                    <Button variant="ghost" size="sm" onClick={() => { setEditEntry(u); setDrawerOpen(true); }} aria-label="Edit URL">
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteEntry(u)} aria-label="Delete URL">
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        <div className="rounded-xl border border-zinc-100 shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/50">
                <TableHead>Application</TableHead>
                <TableHead>Figma URL</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {urls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                    No Figma URLs found.
                  </TableCell>
                </TableRow>
              ) : (
                urls.map((u, i) => (
                  <TableRow key={u.id} className={i % 2 === 1 ? "bg-zinc-50/50" : ""}>
                    <TableCell className="font-medium">{u.application}</TableCell>
                    <TableCell>
                      <a
                        href={u.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
                      >
                        <ExternalLink className="size-3" />
                        {truncateUrl(u.url)}
                      </a>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {u.details || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <a href={u.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" aria-label="Open in Figma">
                            <ExternalLink className="size-4" />
                          </Button>
                        </a>
                        <Button variant="ghost" size="sm" onClick={() => { setEditEntry(u); setDrawerOpen(true); }} aria-label="Edit URL">
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteEntry(u)} aria-label="Delete URL">
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
      )}

      {/* Drawer */}
      <FigmaUrlDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        entry={editEntry}
        applications={applications}
        onSaved={fetchUrls}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        open={!!deleteEntry}
        onOpenChange={(open) => !open && setDeleteEntry(null)}
        title="Delete URL"
        description={deleteEntry ? `Delete ${deleteEntry.application} URL? This action cannot be undone.` : ""}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        destructive
      />
    </div>
  );
}
