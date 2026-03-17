"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Eye } from "lucide-react";

interface ProjectRow {
  projectId: number;
  projectName: string;
  totalHours: number;
  earningsCAD: number;
  earningsINR: number;
}

interface ProjectEarningsTableProps {
  projects: ProjectRow[];
  totalHours: number;
  totalCAD: number;
  totalINR: number;
}

type SortKey = "projectName" | "totalHours" | "earningsCAD" | "earningsINR";

export function ProjectEarningsTable({
  projects,
  totalHours,
  totalCAD,
  totalINR,
}: ProjectEarningsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("totalHours");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...projects].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDir === "asc" ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
  });

  const formatCAD = (n: number) =>
    new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n);
  const formatINR = (n: number) =>
    "₹" + new Intl.NumberFormat("en-IN").format(Math.round(n));

  return (
    <div className="rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-50/50">
            <TableHead>
              <Button variant="ghost" size="sm" className="gap-1 -ml-3 font-semibold" onClick={() => handleSort("projectName")}>
                Project Name <ArrowUpDown className="size-3" />
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button variant="ghost" size="sm" className="gap-1 font-semibold" onClick={() => handleSort("totalHours")}>
                Total Hours <ArrowUpDown className="size-3" />
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button variant="ghost" size="sm" className="gap-1 font-semibold" onClick={() => handleSort("earningsCAD")}>
                Earnings (CAD) <ArrowUpDown className="size-3" />
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button variant="ghost" size="sm" className="gap-1 font-semibold" onClick={() => handleSort("earningsINR")}>
                Earnings (INR) <ArrowUpDown className="size-3" />
              </Button>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((project, i) => (
            <TableRow key={project.projectId} className={i % 2 === 1 ? "bg-zinc-50/50" : ""}>
              <TableCell>
                <Link
                  href={`/timesheet?projectId=${project.projectId}`}
                  className="text-accent hover:underline font-medium"
                >
                  {project.projectName}
                </Link>
              </TableCell>
              <TableCell className="text-right font-mono">{project.totalHours.toFixed(2)}</TableCell>
              <TableCell className="text-right font-mono">{formatCAD(project.earningsCAD)}</TableCell>
              <TableCell className="text-right font-mono">{formatINR(project.earningsINR)}</TableCell>
              <TableCell className="text-right">
                <Link href={`/timesheet?projectId=${project.projectId}`}>
                  <Button variant="ghost" size="sm" aria-label={`View timesheet for ${project.projectName}`}>
                    <Eye className="size-4" />
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
          {/* Grand Total */}
          <TableRow className="bg-zinc-100 font-bold border-t-2">
            <TableCell>Grand Total</TableCell>
            <TableCell className="text-right font-mono">{totalHours.toFixed(2)}</TableCell>
            <TableCell className="text-right font-mono">{formatCAD(totalCAD)}</TableCell>
            <TableCell className="text-right font-mono">{formatINR(totalINR)}</TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
